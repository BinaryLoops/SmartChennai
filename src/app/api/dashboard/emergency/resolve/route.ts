import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "emergency_operator" && session.role !== "super_admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { incidentId } = await req.json();

    if (!incidentId) {
      return NextResponse.json({ error: "Missing incidentId" }, { status: 400 });
    }

    const incident = await prisma.incident.findUnique({ where: { id: incidentId } });
    if (!incident) return NextResponse.json({ error: "Incident not found" }, { status: 404 });

    const updated = await prisma.incident.update({
      where: { id: incidentId },
      data: { status: "resolved", resolvedAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        actionType: "EMERGENCY_RESOLVE",
        incidentId,
        operatorId: session.id,
        oldValues: JSON.parse(JSON.stringify({ status: incident.status })),
        newValues: JSON.parse(JSON.stringify({ status: "resolved" })),
      }
    });

    return NextResponse.json({ success: true, incident: updated });
  } catch (error) {
    console.error("Emergency resolve error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
