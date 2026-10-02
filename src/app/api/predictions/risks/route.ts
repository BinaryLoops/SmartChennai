import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role === "citizen") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const domain = searchParams.get("domain");

    const where: any = { 
      expiresAt: { gt: new Date() },
      riskLevel: { in: ['HIGH', 'CRITICAL'] }
    };
    
    if (domain) {
      where.domain = domain;
    }

    // Get active high/critical risks
    let risks = await prisma.predictionSnapshot.findMany({
      where,
      orderBy: { generatedAt: 'desc' },
      take: 100
    });
    
    // Sort by risk severity then confidence
    risks = risks.sort((a, b) => {
      const riskScore = { 'CRITICAL': 4, 'HIGH': 3, 'MODERATE': 2, 'LOW': 1 };
      const aScore = riskScore[a.riskLevel] * a.confidence;
      const bScore = riskScore[b.riskLevel] * b.confidence;
      return bScore - aScore;
    });

    return NextResponse.json({ data: risks });
  } catch (error) {
    console.error("[Predictions API] Risks error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
