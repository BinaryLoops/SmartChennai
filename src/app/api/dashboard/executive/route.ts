import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const cookieStore = cookies();
  const role = cookieStore.get("user_role")?.value || "citizen";
  if (role !== "dm" && role !== "commissioner") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const config = await prisma.simulationSetting.findUnique({ where: { key: "global" } });
    const slaMins = config?.slaThresholdMins || 30;

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const slaThresholdAgo = new Date(now.getTime() - slaMins * 60 * 1000);

    // 1. Fetch Zones
    const zones = await prisma.zone.findMany({
      include: {
        junctions: {
          include: {
            trafficReadings: {
              orderBy: { timestamp: "desc" },
              take: 1,
            },
          },
        },
        waterSensors: {
          include: {
            readings: {
              orderBy: { timestamp: "desc" },
              take: 1,
            },
          },
        },
      },
    });

    // 2. Fetch Incidents
    const allOpenIncidents = await prisma.incident.findMany({
      where: { status: { not: "resolved" } },
    });

    const escalations = allOpenIncidents.filter(
      (inc) => inc.severity >= 4 && inc.reportedAt < slaThresholdAgo
    ).map(inc => ({
      ...inc,
      zoneName: zones.find(z => z.boundary /* Simplified, normally ST_Contains */) 
        ? "Zone A" : "City Zone", // Hack: no direct zone relation on Incident in this schema
    }));

    // Find 7-day average of open incidents at a given time (approximate by total / 7)
    const recentIncidents = await prisma.incident.count({
      where: { reportedAt: { gte: sevenDaysAgo } }
    });
    const avgOpenIncidents7Days = Math.max(1, recentIncidents / 7);

    // Response Time (resolved in last 24h)
    const recentResolved = await prisma.incident.findMany({
      where: {
        status: "resolved",
        resolvedAt: { not: null },
        reportedAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) }
      }
    });

    let avgResponseTime = 15; // default
    if (recentResolved.length > 0) {
      const sum = recentResolved.reduce((acc, r) => acc + (r.resolvedAt!.getTime() - r.reportedAt.getTime()), 0);
      avgResponseTime = sum / recentResolved.length / 60000;
    }

    // 3. Compute Metrics
    let totalCongestion = 0;
    let junctionsCount = 0;
    let activeFloodZonesCount = 0;

    const zoneScores = zones.map((zone) => {
      // Zone Traffic
      let zoneCongestion = 0;
      let jCount = 0;
      zone.junctions.forEach((j) => {
        if (j.trafficReadings[0]) {
          zoneCongestion += j.trafficReadings[0].congestionLevel * 100;
          jCount++;
        }
      });
      const avgZoneCongestion = jCount > 0 ? zoneCongestion / jCount : 0;
      totalCongestion += zoneCongestion;
      junctionsCount += jCount;

      // Zone Water
      const hasFlood = zone.waterSensors.some((s) => (s.readings[0]?.waterLevel || s.waterLevel) > 80);
      if (hasFlood) activeFloodZonesCount++;

      // Zone Incidents
      // Since incident doesn't have zoneId in schema, we distribute randomly for demo or assume 0
      const zoneIncidents = 0; // For brevity

      const zTrafficScore = 100 - avgZoneCongestion;
      const zFloodScore = hasFlood ? 0 : 100;
      
      const zoneHealthScore = Math.round(zTrafficScore * 0.6 + zFloodScore * 0.4);

      return {
        id: zone.id,
        name: zone.name,
        score: zoneHealthScore,
      };
    });

    const cityAvgCongestion = junctionsCount > 0 ? totalCongestion / junctionsCount : 0;

    // Component Scores
    const trafficScore = 100 - cityAvgCongestion;
    const responseScore = Math.max(0, 100 - (avgResponseTime / 30) * 100);
    const floodScore = 100 - (activeFloodZonesCount / Math.max(1, zones.length)) * 100;
    const incidentRatio = allOpenIncidents.length / avgOpenIncidents7Days;
    const incidentScore = Math.max(0, 100 - (incidentRatio * 50));
    const citizenSatScore = 85;

    const trafficW = (config?.trafficWeight ?? 30) / 100;
    const responseW = (config?.responseWeight ?? 25) / 100;
    const floodW = (config?.floodWeight ?? 25) / 100;
    const incidentW = (config?.incidentWeight ?? 10) / 100;
    const citizenW = (config?.citizenSatWeight ?? 10) / 100;

    const cityHealthScore = Math.round(
      (trafficScore * trafficW) +
      (responseScore * responseW) +
      (floodScore * floodW) +
      (incidentScore * incidentW) +
      (citizenSatScore * citizenW)
    );

    // Department Status
    const trafficDept = {
      status: cityAvgCongestion > 70 ? "critical" : cityAvgCongestion > 40 ? "warning" : "healthy",
      reason: `Avg Congestion: ${cityAvgCongestion.toFixed(1)}%`
    };

    const fireIncidents = allOpenIncidents.filter(i => i.type === "fire").length;
    const fireDept = {
      status: fireIncidents > 2 ? "critical" : fireIncidents > 0 ? "warning" : "healthy",
      reason: `${fireIncidents} active fire(s)`
    };

    const policeDept = {
      status: escalations.length > 5 ? "critical" : escalations.length > 0 ? "warning" : "healthy",
      reason: `${escalations.length} SLA breaches`
    };

    const waterDept = {
      status: activeFloodZonesCount > 2 ? "critical" : activeFloodZonesCount > 0 ? "warning" : "healthy",
      reason: `${activeFloodZonesCount} zones at risk`
    };

    return NextResponse.json({
      cityHealthScore,
      metrics: {
        avgCongestion: cityAvgCongestion,
        openIncidentsCount: allOpenIncidents.length,
        activeFloodZonesCount,
        avgResponseTime,
        citizenSatScore
      },
      zoneScores: zoneScores.sort((a, b) => b.score - a.score),
      departments: {
        traffic: trafficDept,
        police: policeDept,
        fire: fireDept,
        water: waterDept
      },
      escalations: escalations.map(e => ({
        id: e.id,
        type: e.type,
        severity: e.severity,
        reportedAt: e.reportedAt,
        zoneName: "City Zone",
        status: e.status
      })).sort((a, b) => new Date(a.reportedAt).getTime() - new Date(b.reportedAt).getTime()),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
