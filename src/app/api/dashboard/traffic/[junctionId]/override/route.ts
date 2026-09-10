import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: { junctionId: string } }
) {
  try {
    const { junctionId } = params;
    const body = await request.json();
    const { greenDuration, redDuration } = body;

    if (
      typeof greenDuration !== "number" ||
      typeof redDuration !== "number" ||
      greenDuration < 10 ||
      redDuration < 10
    ) {
      return NextResponse.json({ error: "Invalid duration values" }, { status: 400 });
    }

    const junction = await prisma.junction.findUnique({
      where: { id: junctionId },
    });

    if (!junction) {
      return NextResponse.json({ error: "Junction not found" }, { status: 404 });
    }

    // Use a transaction to ensure both override update and audit log happen together
    const [override] = await prisma.$transaction([
      prisma.signalOverride.upsert({
        where: { junctionId },
        update: { greenDuration, redDuration },
        create: { junctionId, greenDuration, redDuration },
      }),
      prisma.auditLog.create({
        data: {
          junctionId,
          actionType: "SIGNAL_OVERRIDE",
          newValues: { greenDuration, redDuration },
          operatorId: "operator-1", // Hardcoded for now, will link to auth later
        },
      }),
    ]);

    return NextResponse.json({ success: true, override });
  } catch (error) {
    console.error("[api/dashboard/traffic/junctionId/override] error:", error);
    return NextResponse.json(
      { error: "Failed to save signal override" },
      { status: 500 }
    );
  }
}
