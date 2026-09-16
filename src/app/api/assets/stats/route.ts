import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/assets/stats
 *
 * Summary statistics for the Asset Registry overview KPI cards.
 * Returns total count, counts by status and by category.
 * Cached-friendly: lightweight aggregation queries only.
 */
export async function GET(_req: NextRequest) {
  try {
    const [total, byStatus, byCategory, byZone] = await Promise.all([
      prisma.cityAsset.count(),

      prisma.cityAsset.groupBy({
        by: ["status"],
        _count: { _all: true },
        orderBy: { _count: { status: "desc" } },
      }),

      prisma.cityAsset.groupBy({
        by: ["category"],
        _count: { _all: true },
        orderBy: { _count: { category: "desc" } },
      }),

      prisma.cityAsset.groupBy({
        by: ["zoneId"],
        where: { zoneId: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { zoneId: "desc" } },
        take: 5,
      }),
    ]);

    // Resolve zone names for zone breakdown
    const zoneIds = byZone.map(r => r.zoneId).filter(Boolean) as string[];
    const zones = zoneIds.length
      ? await prisma.zone.findMany({ where: { id: { in: zoneIds } }, select: { id: true, name: true } })
      : [];
    const zoneMap = new Map(zones.map(z => [z.id, z.name]));

    const statusMap: Record<string, number> = {};
    for (const row of byStatus) statusMap[row.status] = row._count._all;

    return NextResponse.json({
      total,
      healthy:     statusMap["HEALTHY"]     ?? 0,
      degraded:    statusMap["DEGRADED"]    ?? 0,
      offline:     statusMap["OFFLINE"]     ?? 0,
      maintenance: statusMap["MAINTENANCE"] ?? 0,
      unknown:     statusMap["UNKNOWN"]     ?? 0,
      byCategory: byCategory.map(r => ({
        category: r.category,
        count: r._count._all,
      })),
      byZone: byZone.map(r => ({
        zoneId: r.zoneId,
        zoneName: r.zoneId ? (zoneMap.get(r.zoneId) ?? r.zoneId) : "Unknown",
        count: r._count._all,
      })),
    });
  } catch (err) {
    console.error("[api/assets/stats] error:", err);
    return NextResponse.json({ error: "Failed to load asset stats" }, { status: 500 });
  }
}
