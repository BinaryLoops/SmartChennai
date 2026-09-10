import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHaversineDistance } from "@/lib/distance";

export async function POST(request: Request) {
  try {
    const { incidentId } = await request.json();

    if (!incidentId) {
      return NextResponse.json({ error: "Missing incidentId" }, { status: 400 });
    }

    const incident = await prisma.incident.findUnique({
      where: { id: incidentId },
    });

    if (!incident) {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 });
    }

    if (incident.status !== "reported" && incident.status !== "verified") {
      return NextResponse.json({ error: "Incident is already dispatched or resolved" }, { status: 400 });
    }

    // Determine the required unit type based on the incident type
    let requiredUnitType: "ambulance" | "fire_truck" = "ambulance";
    if (incident.type === "fire" || incident.type === "flood") {
      requiredUnitType = "fire_truck";
    }

    // Find all available units of the required type
    const availableUnits = await prisma.emergencyUnit.findMany({
      where: {
        isAvailable: true,
        type: requiredUnitType,
      },
    });

    if (availableUnits.length === 0) {
      return NextResponse.json(
        { error: `No available ${requiredUnitType} units` },
        { status: 400 }
      );
    }

    // Find the nearest unit using Haversine
    let nearestUnit = availableUnits[0];
    let minDistance = getHaversineDistance(
      incident.lat,
      incident.lng,
      nearestUnit.lat,
      nearestUnit.lng
    );

    for (let i = 1; i < availableUnits.length; i++) {
      const unit = availableUnits[i];
      const distance = getHaversineDistance(
        incident.lat,
        incident.lng,
        unit.lat,
        unit.lng
      );
      if (distance < minDistance) {
        minDistance = distance;
        nearestUnit = unit;
      }
    }

    // Perform dispatch via a Prisma transaction
    const [updatedIncident, updatedUnit] = await prisma.$transaction([
      prisma.incident.update({
        where: { id: incidentId },
        data: {
          status: "dispatched",
          dispatchedAt: new Date(),
          unitId: nearestUnit.id,
        },
        include: { unit: true },
      }),
      prisma.emergencyUnit.update({
        where: { id: nearestUnit.id },
        data: { isAvailable: false },
      }),
      prisma.auditLog.create({
        data: {
          incidentId,
          actionType: "DISPATCH_UNIT",
          newValues: { unitId: nearestUnit.id, distance: minDistance },
          operatorId: "operator-1", // Simulated
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      incident: updatedIncident,
      distance: minDistance,
    });
  } catch (error) {
    console.error("[api/dashboard/emergency/dispatch] error:", error);
    return NextResponse.json(
      { error: "Failed to dispatch unit" },
      { status: 500 }
    );
  }
}
