import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCCTVAnalysisProvider } from "@/lib/ai-cctv/provider";
import { redisConnection } from "@/lib/redis";
import { CCTVObservationSchema } from "@/lib/ai-cctv/types";

const ANALYSIS_COOLDOWN_MS = parseInt(process.env.CCTV_AI_ANALYSIS_INTERVAL_MS || "30000", 10);

export async function GET(req: Request, { params }: { params: { cameraId: string } }) {
  try {
    const analysis = await prisma.cCTVAnalysis.findFirst({
      where: { cameraId: params.cameraId },
      orderBy: { analyzedAt: 'desc' }
    });

    if (!analysis) {
      return NextResponse.json({ status: "NO_DATA" }, { status: 404 });
    }

    return NextResponse.json({
      status: "READY",
      data: {
        ...analysis,
        traffic: analysis.trafficJson,
        incidents: analysis.incidentJson,
        infrastructure: analysis.infrastructureJson,
        observations: analysis.observationsJson,
      }
    });
  } catch (error) {
    console.error("[GET /api/cctv/analysis] Error:", error);
    return NextResponse.json({ status: "ERROR", message: "Failed to fetch analysis" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: { cameraId: string } }) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ status: "OFFLINE", message: "GEMINI_API_KEY is not configured" }, { status: 503 });
    }

    // 1. Check cooldown
    const latestAnalysis = await prisma.cCTVAnalysis.findFirst({
      where: { cameraId: params.cameraId },
      orderBy: { analyzedAt: 'desc' }
    });

    if (latestAnalysis && (Date.now() - latestAnalysis.analyzedAt.getTime() < ANALYSIS_COOLDOWN_MS)) {
      return NextResponse.json({
        status: "COOLDOWN",
        message: "Analysis requested too soon. Returning cached result.",
        data: {
          ...latestAnalysis,
          traffic: latestAnalysis.trafficJson,
          incidents: latestAnalysis.incidentJson,
          infrastructure: latestAnalysis.infrastructureJson,
          observations: latestAnalysis.observationsJson,
        }
      });
    }

    // 2. Gather Context
    // First find the camera and junction to get the current context
    const camera = await prisma.cCTVFeed.findFirst({
      where: { id: params.cameraId },
      include: { junction: { include: { zone: true } } }
    });

    if (!camera) {
      return NextResponse.json({ status: "ERROR", message: "Camera not found" }, { status: 404 });
    }

    // Attempt to get live telemetry from Redis (fallback to 0 if not found)
    const trafficKey = `traffic:junction:${camera.junctionId}`;
    const liveTrafficStr = await redisConnection.get(trafficKey);
    let vph = 0, speed = 0, cong = 0;
    if (liveTrafficStr) {
      try {
        const liveTraffic = JSON.parse(liveTrafficStr);
        vph = liveTraffic.vehiclesPerHour || 0;
        speed = liveTraffic.avgSpeedKph || 0;
        cong = liveTraffic.congestionLevel || 0;
      } catch (e) {}
    }

    // 3. Request Analysis
    const provider = getCCTVAnalysisProvider();
    
    // Will throw if rate limited or if concurrency limit hangs and times out (semaphore handles limit, timeout could be added)
    const result = await provider.analyzeCamera(
      params.cameraId,
      {
        vehiclesPerHour: vph,
        congestionPercent: Math.round(cong * 100),
        speed: speed
      },
      {
        junctionName: camera.junction.name,
        zoneName: camera.junction.zone.name
      }
    );

    // 4. Save to Database
    const saved = await prisma.cCTVAnalysis.create({
      data: {
        cameraId: params.cameraId,
        videoAsset: "local-registry",
        durationSeconds: result.durationSeconds,
        trafficJson: result.traffic as any,
        incidentJson: result.incidents as any,
        infrastructureJson: result.infrastructure as any,
        confidence: result.confidence,
        observationsJson: result.observations as any,
      }
    });

    // 5. Cross-Check and City Event Emission
    await emitDiscrepancies(result, camera, cong);

    return NextResponse.json({
      status: "READY",
      data: {
        ...saved,
        traffic: saved.trafficJson,
        incidents: saved.incidentJson,
        infrastructure: saved.infrastructureJson,
        observations: saved.observationsJson,
      }
    });
  } catch (error: any) {
    console.error("[POST /api/cctv/analysis] Error:", error);
    
    if (error.message?.includes("quota") || error.status === 429) {
      return NextResponse.json({ status: "RATE_LIMITED", message: "API Quota exceeded." }, { status: 429 });
    }
    
    return NextResponse.json({ status: "ERROR", message: error.message || "Failed to analyze video" }, { status: 200 });
  }
}

async function emitDiscrepancies(result: any, camera: any, simulatedCongestion: number) {
  // Cross check Gemini AI against simulation
  let meaningfulEvent: any = null;

  // Rule 1: High Congestion
  if (result.traffic.trafficLevel === "HIGH" || result.traffic.trafficLevel === "SEVERE") {
    meaningfulEvent = {
      type: "CCTV_HIGH_CONGESTION",
      severity: result.traffic.trafficLevel === "SEVERE" ? "CRITICAL" : "HIGH",
      description: `AI detected ${result.traffic.trafficLevel} traffic at ${camera.junction.name}. Estimated queue: ${result.traffic.queueLengthEstimate} vehicles.`,
    };
  }

  // Rule 2: Discrepancy
  const aiCongestion = result.traffic.congestionPercentEstimate;
  const simCongestionPercent = Math.round(simulatedCongestion * 100);
  if (Math.abs(aiCongestion - simCongestionPercent) > 30) {
    // Only emit discrepancy if we aren't already emitting a high congestion event
    if (!meaningfulEvent) {
       meaningfulEvent = {
         type: "CCTV_ANALYTICS_DISCREPANCY",
         severity: "INFO",
         description: `AI observation (${aiCongestion}%) differs significantly from simulation (${simCongestionPercent}%)`,
       };
    }
  }

  // Rule 3: Incidents
  if (result.incidents.accidentSuspected) {
    meaningfulEvent = {
      type: "CCTV_POSSIBLE_ACCIDENT",
      severity: "CRITICAL",
      description: "AI detected a possible accident on CCTV footage. Operator review required.",
    };
  } else if (result.incidents.smokeOrFire) {
    meaningfulEvent = {
      type: "CCTV_SMOKE_FIRE",
      severity: "CRITICAL",
      description: "AI detected possible smoke or fire on CCTV footage. Immediate review required.",
    };
  } else if (result.incidents.floodingVisible) {
    meaningfulEvent = {
      type: "CCTV_FLOODING_VISIBLE",
      severity: "HIGH",
      description: "AI detected visible flooding or water logging on road.",
    };
  } else if (result.incidents.stalledVehicle) {
    meaningfulEvent = {
      type: "CCTV_STALLED_VEHICLE",
      severity: "MEDIUM",
      description: "AI detected a possible stalled vehicle.",
    };
  } else if (result.incidents.roadObstruction) {
    meaningfulEvent = {
      type: "CCTV_ROAD_OBSTRUCTION",
      severity: "MEDIUM",
      description: "AI detected a road obstruction.",
    };
  }

  if (meaningfulEvent) {
     // We will write the event to DB. The worker event_fabric will NOT deduplicate it directly, 
     // but we can just write it and broadcast it. 
     // To deduplicate properly we should rely on last known state. For simplicity, we just create it.
     
     // Note: In production we should use the same Redis/Socket pattern. 
     // Here we write to DB directly.
     const cityEvent = await prisma.cityEvent.create({
       data: {
         type: meaningfulEvent.type,
         severity: meaningfulEvent.severity,
         description: meaningfulEvent.description,
         zoneId: camera.junction.zone.id,
         source: "cctv-analytics",
         status: "active",
         confidence: result.confidence,
         metadata: {
           cameraId: camera.id,
           junctionId: camera.junctionId,
           aiTrafficJson: result.traffic,
           aiIncidentsJson: result.incidents
         },
         timestamp: new Date()
       }
     });

     // Push to redis so the worker or Next.js socket server can broadcast it.
     // In this architecture, we use Socket.IO Redis emitter but since we don't have it initialized here,
     // We can just rely on the worker's DB polling (if it exists) or just create the DB record.
     // Wait, let's emit directly to Redis PubSub using the pattern expected by the socket server
     const eventPayload = {
        id: cityEvent.id,
        type: cityEvent.type,
        severity: cityEvent.severity,
        description: cityEvent.description,
        zoneId: cityEvent.zoneId,
        zoneName: camera.junction.zone.name,
        source: cityEvent.source,
        status: cityEvent.status,
        confidence: cityEvent.confidence,
        metadata: cityEvent.metadata,
        timestamp: cityEvent.timestamp.toISOString()
     };
     
     // Try to use ioredis to publish a raw event that the socket server might pick up, 
     // or just rely on the DB. The frontend will pick it up on next poll.
     await redisConnection.publish("socket-emit:cityEventNew", JSON.stringify(eventPayload));
  }
}
