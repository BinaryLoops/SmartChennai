import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "water_operator" && session.role !== "super_admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { sensorId, lat, lng, action, incidentId } = await req.json();

    if (action === "CREATE") {
      const incident = await prisma.incident.create({
        data: {
          type: "flood",
          lat,
          lng,
          severity: 4,
          source: "sensor",
          status: "in_progress",
          
          WorkOrder: {
            create: {
              assignedTeam: "Metro Water Rapid Response",
              startedAt: new Date(),
            }
          }
        }
      });

      await prisma.auditLog.create({
        data: {
          actionType: "WATER_WORKORDER_CREATED",
          incidentId: incident.id,
          operatorId: session.id,
          newValues: JSON.parse(JSON.stringify({ status: "in_progress" })),
        }
      });

      return NextResponse.json({ success: true, incident });
    } 
    
    if (action === "RESOLVE" && incidentId) {
      const updated = await prisma.incident.update({
        where: { id: incidentId },
        data: {
          status: "resolved",
          resolvedAt: new Date(),
          resolutionNotes: "Drainage cleared and water pumped out.",
          WorkOrder: {
            update: { completedAt: new Date() }
          }
        }
      });

      await prisma.auditLog.create({
        data: {
          actionType: "WATER_WORKORDER_RESOLVED",
          incidentId,
          operatorId: session.id,
          oldValues: JSON.parse(JSON.stringify({ status: "in_progress" })),
          newValues: JSON.parse(JSON.stringify({ status: "resolved" })),
        }
      });

      return NextResponse.json({ success: true, incident: updated });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Water workorder error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
