import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { speed, scenario } = body;

    await prisma.simulationSetting.update({
      where: { key: "global" },
      data: {
        simSpeedMultiplier: speed || 1,
        scenarioMode: scenario || "normal"
      }
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}