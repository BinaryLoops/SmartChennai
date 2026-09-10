import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCongestionPrediction, detectAnomaly } from "@/lib/predictive";

export async function GET(
  request: Request,
  { params }: { params: { junctionId: string } }
) {
  try {
    const { junctionId } = params;

    const [junction, trafficHistory, override] = await Promise.all([
      // Junction info with zone name
      prisma.junction.findUnique({
        where: { id: junctionId },
        include: { zone: { select: { name: true } } },
      }),
      // Last 24 hours of traffic readings
      prisma.trafficReading.findMany({
        where: {
          junctionId,
          timestamp: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
        select: {
          vehiclesPerHour: true,
          timestamp: true,
        },
        orderBy: { timestamp: "asc" },
      }),
      // Signal override
      prisma.signalOverride.findUnique({
        where: { junctionId },
      }),
    ]);

    if (!junction) {
      return NextResponse.json({ error: "Junction not found" }, { status: 404 });
    }

    // Since simulation worker produces 1 record every 5 seconds, 24 hours = 17,280 records.
    // To avoid sending 17k records to the client, we downsample by averaging per 5 minutes.
    const buckets = new Map<string, { sum: number; count: number }>();
    for (const r of trafficHistory) {
      // 5-minute bucketing logic: slice timestamp up to minutes, then round down minute
      const date = new Date(r.timestamp);
      const m = date.getMinutes();
      const roundedM = m - (m % 5);
      date.setMinutes(roundedM, 0, 0);
      const key = date.toISOString();

      const b = buckets.get(key) || { sum: 0, count: 0 };
      b.sum += r.vehiclesPerHour;
      b.count += 1;
      buckets.set(key, b);
    }

    const downsampledHistory = Array.from(buckets.entries()).map(([ts, b]) => ({
      timestamp: ts,
      vehiclesPerHour: Math.round(b.sum / b.count),
    }));

    // Fetch AI Predictions in parallel without blocking main data if they fail
    let predictionRes = null;
    let anomalyRes = null;
    
    // We need current/recent values for anomaly
    const recentReadings = downsampledHistory.slice(-10).map(h => h.vehiclesPerHour);
    const currentValue = recentReadings.length > 0 ? recentReadings[recentReadings.length - 1] : 0;

    try {
      const [pRes, aRes] = await Promise.all([
        getCongestionPrediction(junctionId),
        detectAnomaly(junctionId, currentValue, recentReadings)
      ]);
      predictionRes = pRes;
      anomalyRes = aRes;
    } catch (e) {
      console.warn("Failed to fetch AI predictions", e);
    }

    return NextResponse.json({
      junction,
      history: downsampledHistory,
      signalOverride: override || { greenDuration: 45, redDuration: 45 },
      predictions: predictionRes?.predictions || [],
      modelUsed: predictionRes?.modelUsed || null,
      anomaly: anomalyRes || null,
    });
  } catch (error) {
    console.error("[api/dashboard/traffic/junctionId] error:", error);
    return NextResponse.json(
      { error: "Failed to load junction data" },
      { status: 500 }
    );
  }
}
