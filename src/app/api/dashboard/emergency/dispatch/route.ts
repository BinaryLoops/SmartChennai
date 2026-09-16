import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "emergency_operator" && session.role !== "super_admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { incidentId, action, unitId } = await req.json();

    if (!incidentId || !action) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const incident = await prisma.incident.findUnique({ where: { id: incidentId } });
    if (!incident) return NextResponse.json({ error: "Incident not found" }, { status: 404 });

    let newStatus = incident.status;
    let dispatchedAt = incident.dispatchedAt;
    let resolvedAt = incident.resolvedAt;
    let updateUnitId = incident.unitId;

    if (action === "DISPATCH" && incident.status === "reported") {
      newStatus = "dispatched";
      dispatchedAt = new Date();
    } else if (action === "ARRIVE" && incident.status === "dispatched") {
      newStatus = "arrived";
    } else if (action === "START_WORK" && incident.status === "arrived") {
      newStatus = "in_progress";
    } else if (action === "RESOLVE" && incident.status === "in_progress") {
      newStatus = "resolved";
      resolvedAt = new Date();
    } else {
      return NextResponse.json({ error: "Invalid state transition" }, { status: 400 });
    }

    const updated = await prisma.incident.update({
      where: { id: incidentId },
      data: { status: newStatus as any, dispatchedAt, resolvedAt, unitId: updateUnitId },
    });

    await prisma.auditLog.create({
      data: {
        actionType: `EMERGENCY_${action}`,
        incidentId,
        operatorId: session.id,
        oldValues: JSON.parse(JSON.stringify({ status: incident.status })),
        newValues: JSON.parse(JSON.stringify({ status: newStatus })),
      }
    });

    return NextResponse.json({ success: true, incident: updated });
  } catch (error) {
    console.error("Emergency dispatch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
