import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(
  request: Request,
  { params }: { params: { sensorId: string } }
) {
  try {
    const { sensorId } = params;
    
    // Fetch telemetry samples for the past 24 hours
    const samples = await prisma.telemetrySample.findMany({
      where: {
        assetId: sensorId,
        metric: "aqi",
        timestamp: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      },
      orderBy: { timestamp: "asc" }
    });

    const history = samples.map(s => ({
      timestamp: s.timestamp.toISOString(),
      aqi: s.value
    }));

    return NextResponse.json({ history });
  } catch (err) {
    console.error("[api] env sensor detail error:", err);
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}
