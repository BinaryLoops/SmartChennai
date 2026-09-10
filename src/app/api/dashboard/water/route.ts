import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [zones, sensors, floodIncidents, settings] = await Promise.all([
      // Fetch zones to map zone names
      prisma.zone.findMany({
        select: { id: true, name: true },
      }),
      
      // Fetch all water sensors
      prisma.waterSensor.findMany({
        include: { zone: { select: { name: true } } }
      }),
      
      // Fetch active flood incidents
      prisma.incident.findMany({
        where: {
          type: "flood",
          status: { not: "resolved" }
        },
        orderBy: { reportedAt: "desc" }
      }),

      // Fetch monsoon setting
      prisma.simulationSetting.findUnique({
        where: { key: "global" }
      })
    ]);

    const formattedSensors = sensors.map((s) => ({
      id: s.id,
      zoneId: s.zoneId,
      zoneName: s.zone.name,
      name: `${s.zone.name} W-${s.zone.name.slice(0, 2)}`,
      lat: s.lat,
      lng: s.lng,
      waterLevel: s.waterLevel,
      timestamp: s.timestamp.toISOString(),
    }));

    return NextResponse.json({
      zones,
      sensors: formattedSensors,
      floodIncidents,
      monsoonEnabled: settings?.monsoonEnabled ?? false
    });
  } catch (error) {
    console.error("[api/dashboard/water] error:", error);
    return NextResponse.json(
      { error: "Failed to load water dashboard data" },
      { status: 500 }
    );
  }
}
