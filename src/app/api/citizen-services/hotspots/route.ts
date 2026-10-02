import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { getHaversineDistance } from "@/lib/distance";

/**
 * GET /api/citizen-services/hotspots
 * Recurring issue detection — spatially clustered from real CitizenServiceRequest data.
 * Returns clusters by category × zone, flagging repeat issues.
 */
export async function GET() {
  try {
    const last30d = new Date(Date.now() - 30 * 24 * 3600 * 1000);

    const requests = await prisma.citizenServiceRequest.findMany({
      where: { submittedAt: { gte: last30d } },
      select: {
        id: true,
        category: true,
        lat: true,
        lng: true,
        status: true,
        priority: true,
        submittedAt: true,
        zoneId: true,
        assetId: true,
        asset: { select: { name: true, assetCode: true } },
        zone: { select: { name: true } },
      },
    });

    // Cluster by category × zone
    const clusterMap = new Map<string, {
      category: string;
      zoneId: string | null;
      zoneName: string;
      reports: typeof requests;
    }>();

    for (const r of requests) {
      const key = `${r.category}::${r.zoneId ?? "unknown"}`;
      if (!clusterMap.has(key)) {
        clusterMap.set(key, {
          category: r.category,
          zoneId: r.zoneId,
          zoneName: r.zone?.name ?? "Unknown Zone",
          reports: [],
        });
      }
      clusterMap.get(key)!.reports.push(r);
    }

    // Build hotspot output — filter clusters with > 2 reports
    const hotspots = Array.from(clusterMap.values())
      .filter(c => c.reports.length >= 2)
      .map(cluster => {
        // Centroid
        const avgLat = cluster.reports.reduce((s, r) => s + r.lat, 0) / cluster.reports.length;
        const avgLng = cluster.reports.reduce((s, r) => s + r.lng, 0) / cluster.reports.length;

        // Recent trend (last 7d vs earlier)
        const last7d = new Date(Date.now() - 7 * 24 * 3600 * 1000);
        const recentCount = cluster.reports.filter(r => r.submittedAt >= last7d).length;
        const trend = recentCount > cluster.reports.length / 2 ? "INCREASING" : "STABLE";

        // Priority context
        const hasCritical = cluster.reports.some(r => r.priority === "CRITICAL");
        const hasHigh = cluster.reports.some(r => r.priority === "HIGH");
        const overallPriority = hasCritical ? "CRITICAL" : hasHigh ? "HIGH" : "MEDIUM";

        // Unique affected assets
        const affectedAssets = [
          ...new Set(
            cluster.reports
              .filter(r => r.asset)
              .map(r => `${r.asset!.assetCode} — ${r.asset!.name}`)
          ),
        ].slice(0, 3);

        const openCount = cluster.reports.filter(r =>
          !["RESOLVED", "CLOSED", "REJECTED"].includes(r.status)
        ).length;

        return {
          id: `${cluster.category}-${cluster.zoneId ?? "unknown"}`,
          category: cluster.category,
          zoneId: cluster.zoneId,
          zoneName: cluster.zoneName,
          lat: parseFloat(avgLat.toFixed(5)),
          lng: parseFloat(avgLng.toFixed(5)),
          totalReports: cluster.reports.length,
          openReports: openCount,
          recentReports: recentCount,
          trend,
          priority: overallPriority,
          affectedAssets,
          isRecurring: cluster.reports.length >= 3,
        };
      })
      .sort((a, b) => b.totalReports - a.totalReports);

    return NextResponse.json({ hotspots });
  } catch (err: any) {
    console.error("[GET /api/citizen-services/hotspots]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
