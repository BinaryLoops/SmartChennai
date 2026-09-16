import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "traffic_operator" && session.role !== "super_admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { junctionId, durationMinutes, reason } = await req.json();

    if (!junctionId || !durationMinutes) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const expiresAt = new Date(Date.now() + durationMinutes * 60000);

    const override = await prisma.signalOverride.upsert({
      where: { junctionId },
      update: { expiresAt, reason },
      create: {
        junctionId,
        expiresAt,
        reason,
        greenDuration: 60,
        redDuration: 20,
      },
    });

    await prisma.auditLog.create({
      data: {
        actionType: "SIGNAL_OVERRIDE_APPLIED",
        junctionId,
        operatorId: session.id,
        newValues: JSON.parse(JSON.stringify({ expiresAt, reason, durationMinutes })),
      }
    });

    return NextResponse.json({ success: true, override });
  } catch (error) {
    console.error("Traffic override error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
