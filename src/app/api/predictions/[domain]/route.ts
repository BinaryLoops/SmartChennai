import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(request: Request, { params }: { params: { domain: string } }) {
  try {
    const session = await getSession();
    if (!session || session.role === "citizen") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("activeOnly") !== "false";
    const entityId = searchParams.get("entityId");
    
    const where: any = { domain: params.domain };
    
    if (activeOnly) {
      where.expiresAt = { gt: new Date() };
    }
    
    if (entityId) {
      where.entityId = entityId;
    }

    const predictions = await prisma.predictionSnapshot.findMany({
      where,
      orderBy: { generatedAt: 'desc' },
      take: activeOnly ? 200 : 500
    });

    return NextResponse.json({ data: predictions });
  } catch (error) {
    console.error(`[Predictions API] Domain ${params.domain} error:`, error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
