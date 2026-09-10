import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/citizen/alerts
 * Returns recent public-safe incident and water alert data for the citizen portal.
 * Strips internal fields (unitId, priorityScore, description) for privacy.
 * Cached with 10-second Cache-Control to reduce DB load.
 */
export async function GET() {
  try {
    // Recent incidents — public-safe fields only
    const incidents = await prisma.incident.findMany({
      where: {
        status: { not: "resolved" },
      },
      orderBy: { reportedAt: "desc" },
      take: 50,
      select: {
        id: true,
        type: true,
        lat: true,
        lng: true,
        severity: true,
        status: true,
        source: true,
        reportedBy: true,
        reportedAt: true,
        // Intentionally omit: description, priorityScore, referenceId, unitId
      },
    });

    // Water sensors with elevated risk levels
    const waterSensors = await prisma.waterSensor.findMany({
      include: {
        zone: { select: { name: true } },
      },
    });

    // Filter to sensors with latest reading > watch threshold (80cm)
    const floodAlerts = waterSensors
      .filter((s) => s.waterLevel >= 80)
      .map((s) => ({
        sensorId: s.id,
        zoneName: s.zone.name,
        lat: s.lat,
        lng: s.lng,
        waterLevel: s.waterLevel,
        riskLevel:
          s.waterLevel >= 160 ? "danger" :
          s.waterLevel >= 120 ? "warning" :
          s.waterLevel >= 80 ? "watch" : "normal",
      }));

    return NextResponse.json(
      { incidents, floodAlerts },
      {
        headers: {
          "Cache-Control": "public, s-maxage=10, stale-while-revalidate=5",
        },
      }
    );
  } catch (error: any) {
    console.error("[GET /api/citizen/alerts] Error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve public alerts" },
      { status: 500 }
    );
  }
}
