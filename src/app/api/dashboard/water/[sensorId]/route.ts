import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { sensorId: string } }
) {
  try {
    const { sensorId } = params;

    // Fetch up to the last 720 readings (approx 1 hour at 5s intervals)
    const history = await prisma.waterReading.findMany({
      where: { sensorId },
      select: {
        waterLevel: true,
        timestamp: true,
      },
      orderBy: { timestamp: "desc" },
      take: 720,
    });

    // Reverse to get chronological order for the chart
    history.reverse();

    return NextResponse.json({
      history,
    });
  } catch (error) {
    console.error("[api/dashboard/water/sensorId] error:", error);
    return NextResponse.json(
      { error: "Failed to load sensor history" },
      { status: 500 }
    );
  }
}
