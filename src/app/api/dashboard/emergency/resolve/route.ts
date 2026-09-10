import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

    if (incident.status === "resolved") {
      return NextResponse.json({ error: "Incident is already resolved" }, { status: 400 });
    }

    const resolvedTime = new Date();

    const [updatedIncident] = await prisma.$transaction([
      prisma.incident.update({
        where: { id: incidentId },
        data: {
          status: "resolved",
          resolvedAt: resolvedTime,
        },
        include: { unit: true },
      }),
      // Only free the unit if one was assigned
      ...(incident.unitId
        ? [
            prisma.emergencyUnit.update({
              where: { id: incident.unitId },
              data: { isAvailable: true },
            }),
          ]
        : []),
      prisma.auditLog.create({
        data: {
          incidentId,
          actionType: "RESOLVE_INCIDENT",
          operatorId: "operator-1", // Simulated
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      incident: updatedIncident,
    });
  } catch (error) {
    console.error("[api/dashboard/emergency/resolve] error:", error);
    return NextResponse.json(
      { error: "Failed to resolve incident" },
      { status: 500 }
    );
  }
}
