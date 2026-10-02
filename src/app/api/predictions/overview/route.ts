import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role === "citizen") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the most recent predictions per domain
    const domains = ['traffic', 'flood', 'environment', 'waste', 'energy', 'transit', 'emergency', 'citizen', 'infrastructure'];
    const overview: Record<string, any> = {};

    for (const domain of domains) {
      const topRisks = await prisma.predictionSnapshot.findMany({
        where: { domain, expiresAt: { gt: new Date() } },
        orderBy: [
          { riskLevel: 'asc' }, // CRITICAL is last in default enum sort? Actually enum sort is by declaration order: LOW, MODERATE, HIGH, CRITICAL. So we want desc.
          { predictedValue: 'desc' }
        ],
        take: 3
      });
      
      // Sort manually to be safe since enum sorting in Prisma can sometimes be tricky
      const sorted = topRisks.sort((a, b) => {
        const riskScore = { 'CRITICAL': 4, 'HIGH': 3, 'MODERATE': 2, 'LOW': 1 };
        return riskScore[b.riskLevel] - riskScore[a.riskLevel];
      });

      overview[domain] = {
        topRisks: sorted,
        count: await prisma.predictionSnapshot.count({ where: { domain, expiresAt: { gt: new Date() } } })
      };
    }

    return NextResponse.json({ data: overview });
  } catch (error) {
    console.error("[Predictions API] Overview error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
