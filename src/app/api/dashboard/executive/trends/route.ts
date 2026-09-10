import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const cookieStore = cookies();
  const role = cookieStore.get("user_role")?.value || "citizen";
  if (role !== "dm" && role !== "commissioner") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const range = searchParams.get("range") || "weekly";
  const days = range === "monthly" ? 30 : 7;
  const now = new Date();
  const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  try {
    // We will generate the date buckets
    const dates: string[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      dates.push(d.toISOString().split("T")[0]);
    }

    // Initialize trend data
    const trendMap: Record<string, any> = {};
    dates.forEach((date) => {
      trendMap[date] = {
        date,
        congestion: null,
        responseTime: null,
        citizenSat: 85, // Mock fallback
      };
    });

    // 1. Congestion history
    const trafficReadings = await prisma.trafficReading.findMany({
      where: { timestamp: { gte: cutoffDate } },
      select: { timestamp: true, congestionLevel: true },
    });

    // Group by date
    const dailyCongestion: Record<string, { sum: number; count: number }> = {};
    trafficReadings.forEach((r) => {
      const d = r.timestamp.toISOString().split("T")[0];
      if (!dailyCongestion[d]) dailyCongestion[d] = { sum: 0, count: 0 };
      dailyCongestion[d].sum += r.congestionLevel;
      dailyCongestion[d].count++;
    });

    Object.keys(dailyCongestion).forEach((d) => {
      if (trendMap[d]) {
        trendMap[d].congestion = Math.round((dailyCongestion[d].sum / dailyCongestion[d].count) * 100);
      }
    });

    // 2. Response Time history
    const resolvedIncidents = await prisma.incident.findMany({
      where: {
        status: "resolved",
        resolvedAt: { not: null },
        reportedAt: { gte: cutoffDate },
      },
      select: { reportedAt: true, resolvedAt: true },
    });

    const dailyResponse: Record<string, { sum: number; count: number }> = {};
    resolvedIncidents.forEach((i) => {
      if (i.resolvedAt) {
        const d = i.reportedAt.toISOString().split("T")[0];
        const mins = (i.resolvedAt.getTime() - i.reportedAt.getTime()) / 60000;
        if (!dailyResponse[d]) dailyResponse[d] = { sum: 0, count: 0 };
        dailyResponse[d].sum += mins;
        dailyResponse[d].count++;
      }
    });

    Object.keys(dailyResponse).forEach((d) => {
      if (trendMap[d]) {
        trendMap[d].responseTime = Math.round(dailyResponse[d].sum / dailyResponse[d].count);
      }
    });

    const data = Object.values(trendMap);

    // If all congestion/response values are null, it means there is no historical data
    // We should pass a flag to the frontend to indicate sparse data
    const hasSufficientData = data.some(d => d.congestion !== null || d.responseTime !== null);

    // Ensure we don't return nulls to recharts if not wanted, or Recharts can handle nulls (gaps)
    return NextResponse.json({
      data,
      hasSufficientData
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
