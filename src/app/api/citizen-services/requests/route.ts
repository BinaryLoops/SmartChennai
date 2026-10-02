import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { calculateSlaStatus } from "@/lib/citizenServices";

/**
 * GET /api/citizen-services/requests
 * Operator queue — all service requests with full operational context.
 * Auth: operator+
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const category = searchParams.get("category");
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 100);

    const whereClause: any = {};
    if (status) whereClause.status = status;
    if (category) whereClause.category = category;

    const [requests, total] = await Promise.all([
      prisma.citizenServiceRequest.findMany({
        where: whereClause,
        orderBy: [{ priority: "asc" }, { submittedAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          referenceCode: true,
          category: true,
          description: true,
          lat: true,
          lng: true,
          ward: true,
          status: true,
          priority: true,
          department: true,
          slaDueAt: true,
          submittedAt: true,
          assignedAt: true,
          resolvedAt: true,
          updatedAt: true,
          rating: true,
          // Do NOT expose sessionToken to operators
          asset: { select: { name: true, assetCode: true, assetType: true } },
          zone: { select: { name: true } },
          workOrder: {
            select: {
              workOrderCode: true,
              status: true,
              priority: true,
              Crew: { select: { crewCode: true, specialization: true } },
            },
          },
        },
      }),
      prisma.citizenServiceRequest.count({ where: whereClause }),
    ]);

    const enriched = requests.map(r => ({
      ...r,
      slaStatus: calculateSlaStatus(r.status, r.slaDueAt, r.resolvedAt),
    }));

    return NextResponse.json({ requests: enriched, total, page, limit });
  } catch (err: any) {
    console.error("[GET /api/citizen-services/requests]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
