import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/dashboard/initial
 *
 * Returns all data needed to hydrate the dashboard on first load:
 * zones, junctions, latest traffic readings, CCTV feeds, recent incidents,
 * and 1-hour congestion history aggregated per minute.
 */
export async function GET() {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const [zones, junctions, cctvFeeds, recentIncidents, trafficHistory] =
      await Promise.all([
        // All zones with boundary GeoJSON
        prisma.zone.findMany({
          select: { id: true, name: true, boundary: true, population: true },
        }),

        // All junctions with their latest traffic reading
        prisma.junction.findMany({
          select: {
            id: true,
            name: true,
            zoneId: true,
            lat: true,
            lng: true,
            trafficReadings: {
              orderBy: { timestamp: "desc" },
              take: 1,
              select: {
                vehiclesPerHour: true,
                avgSpeed: true,
                congestionLevel: true,
                timestamp: true,
              },
            },
          },
        }),

        // All CCTV feeds
        prisma.cCTVFeed.findMany({
          select: {
            id: true,
            junctionId: true,
            lat: true,
            lng: true,
            status: true,
            junction: { select: { name: true, zone: { select: { name: true } } } },
          },
        }),

        // Recent active incidents (last 24h)
        prisma.incident.findMany({
          where: {
            reportedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
            status: "reported",
          },
          orderBy: { reportedAt: "desc" },
          take: 50,
        }),

        // Last 1 hour of traffic readings for congestion chart
        // Aggregated directly in Postgres for extreme performance
        prisma.$queryRaw`
          SELECT 
            date_trunc('minute', timestamp) as "timestamp", 
            AVG("congestionLevel") as "avgCongestion"
          FROM "TrafficReading"
          WHERE timestamp >= ${oneHourAgo}
          GROUP BY date_trunc('minute', timestamp)
          ORDER BY "timestamp" ASC
        `,
      ]);

    // Format pre-aggregated SQL results
    const congestionHistory = (trafficHistory as any[]).map(row => ({
      timestamp: new Date(row.timestamp).toISOString().slice(0, 16),
      avgCongestion: Math.round(row.avgCongestion * 100)
    }));

    // Format junctions with their latest reading
    const junctionsWithTraffic = junctions.map((j) => {
      const latest = j.trafficReadings[0];
      return {
        id: j.id,
        name: j.name,
        zoneId: j.zoneId,
        lat: j.lat,
        lng: j.lng,
        congestionLevel: latest?.congestionLevel ?? 0,
        vehiclesPerHour: latest?.vehiclesPerHour ?? 0,
        avgSpeed: latest?.avgSpeed ?? 0,
      };
    });

    // Format CCTV feeds
    const cameras = cctvFeeds.map((c) => ({
      id: c.id,
      junctionId: c.junctionId,
      junctionName: c.junction.name,
      zoneName: c.junction.zone?.name ?? "",
      lat: c.lat,
      lng: c.lng,
      status: c.status,
    }));

    // Format incidents
    const incidents = recentIncidents.map((i) => ({
      id: i.id,
      type: i.type,
      severity: i.severity,
      lat: i.lat,
      lng: i.lng,
      source: i.source,
      status: i.status,
      reportedAt: i.reportedAt.toISOString(),
    }));

    return NextResponse.json({
      zones,
      junctions: junctionsWithTraffic,
      cameras,
      incidents,
      congestionHistory,
      camerasOnline: cameras.filter((c) => c.status === "online").length,
      totalCameras: cameras.length,
    });
  } catch (error) {
    console.error("[api/dashboard/initial] error:", error);
    return NextResponse.json(
      { error: "Failed to load dashboard data" },
      { status: 500 }
    );
  }
}
