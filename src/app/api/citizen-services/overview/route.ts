import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/citizen-services/overview
 * Operator KPI overview. Auth: operator+ roles.
 */
export async function GET() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const now = new Date();

    const [
      totalToday,
      openRequests,
      slaAtRisk,
      slaBreached,
      resolved,
      ratingsData,
      categoryBreakdown,
      zoneBreakdown,
    ] = await Promise.all([
      // Requests submitted today
      prisma.citizenServiceRequest.count({ where: { submittedAt: { gte: today } } }),
      // Currently open
      prisma.citizenServiceRequest.count({
        where: { status: { in: ["SUBMITTED", "RECEIVED", "VERIFIED", "TRIAGED", "ASSIGNED", "IN_PROGRESS", "BLOCKED"] } },
      }),
      // SLA at risk (within 20% of due, not breached)
      prisma.citizenServiceRequest.count({
        where: {
          status: { in: ["SUBMITTED", "RECEIVED", "VERIFIED", "TRIAGED", "ASSIGNED", "IN_PROGRESS"] },
          slaDueAt: {
            gte: now,
            lte: new Date(now.getTime() + 4 * 3600 * 1000), // next 4 hours
          },
        },
      }),
      // SLA breached
      prisma.citizenServiceRequest.count({
        where: {
          status: { in: ["SUBMITTED", "RECEIVED", "VERIFIED", "TRIAGED", "ASSIGNED", "IN_PROGRESS"] },
          slaDueAt: { lt: now },
        },
      }),
      // Resolved (last 7d)
      prisma.citizenServiceRequest.count({
        where: {
          status: { in: ["RESOLVED", "CLOSED"] },
          resolvedAt: { gte: new Date(now.getTime() - 7 * 24 * 3600 * 1000) },
        },
      }),
      // Average rating
      prisma.citizenServiceRequest.aggregate({
        _avg: { rating: true },
        where: { rating: { not: null } },
      }),
      // Category breakdown
      prisma.citizenServiceRequest.groupBy({
        by: ["category"],
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 10,
      }),
      // Zone breakdown
      prisma.citizenServiceRequest.groupBy({
        by: ["zoneId"],
        _count: { id: true },
        where: { zoneId: { not: null } },
        orderBy: { _count: { id: "desc" } },
        take: 5,
      }),
    ]);

    // Average resolution time (hours) for last 30d
    const resolvedRequests = await prisma.citizenServiceRequest.findMany({
      where: {
        status: { in: ["RESOLVED", "CLOSED"] },
        resolvedAt: { not: null },
        submittedAt: { gte: new Date(now.getTime() - 30 * 24 * 3600 * 1000) },
      },
      select: { submittedAt: true, resolvedAt: true },
    });

    let avgResolutionHours = 0;
    if (resolvedRequests.length > 0) {
      const totalHours = resolvedRequests.reduce((sum, r) => {
        if (!r.resolvedAt) return sum;
        return sum + (r.resolvedAt.getTime() - r.submittedAt.getTime()) / 3600000;
      }, 0);
      avgResolutionHours = parseFloat((totalHours / resolvedRequests.length).toFixed(1));
    }

    // Get zone names
    const zoneIds = zoneBreakdown.map(z => z.zoneId).filter(Boolean) as string[];
    const zones = await prisma.zone.findMany({ where: { id: { in: zoneIds } }, select: { id: true, name: true } });
    const zoneMap = new Map(zones.map(z => [z.id, z.name]));

    return NextResponse.json({
      requestsToday: totalToday,
      openRequests,
      slaAtRisk,
      slaBreached,
      resolvedLast7d: resolved,
      avgResolutionHours,
      avgRating: ratingsData._avg.rating ? parseFloat(ratingsData._avg.rating.toFixed(2)) : null,
      categoryBreakdown: categoryBreakdown.map(c => ({ category: c.category, count: c._count.id })),
      zoneBreakdown: zoneBreakdown.map(z => ({
        zoneId: z.zoneId,
        zoneName: zoneMap.get(z.zoneId!) ?? "Unknown",
        count: z._count.id,
      })),
    });
  } catch (err: any) {
    console.error("[GET /api/citizen-services/overview]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
