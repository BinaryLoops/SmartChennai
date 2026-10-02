import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateSlaStatus } from "@/lib/citizenServices";

/**
 * GET /api/citizen/reports/[id]
 * Get detail of a specific service request.
 * Requires matching sessionToken header.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionToken = req.headers.get("x-session-token");
    if (!sessionToken) {
      return NextResponse.json({ error: "Session token required" }, { status: 401 });
    }

    const request = await prisma.citizenServiceRequest.findUnique({
      where: { id: params.id },
      include: {
        timeline: { orderBy: { timestamp: "asc" } },
        asset: {
          select: { name: true, assetCode: true, assetType: true, status: true },
        },
        zone: { select: { name: true } },
        workOrder: {
          select: {
            workOrderCode: true,
            status: true,
            priority: true,
            assignedTeam: true,
            slaDueAt: true,
            Crew: { select: { crewCode: true, specialization: true } },
          },
        },
      },
    });

    if (!request) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Enforce session-scoped access — citizen A cannot see citizen B's report
    if (request.sessionToken && request.sessionToken !== sessionToken) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const slaStatus = calculateSlaStatus(
      request.status,
      request.slaDueAt,
      request.resolvedAt
    );

    // Strip sessionToken from response
    const { sessionToken: _token, ...safeRequest } = request as any;

    return NextResponse.json({
      request: {
        ...safeRequest,
        slaStatus,
      },
    });
  } catch (err: any) {
    console.error("[GET /api/citizen/reports/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
