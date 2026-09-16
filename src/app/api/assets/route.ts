import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/assets
 *
 * Paginated, filterable city asset registry list.
 * For LINKED assets (refType set), resolves live status from the domain
 * entity before returning. For STANDALONE assets, returns stored status.
 *
 * Query params:
 *   page      number  (default 1)
 *   limit     number  (default 20, max 100)
 *   category  string  AssetCategory enum value
 *   status    string  AssetStatus enum value
 *   zone      string  zoneId
 *   type      string  assetType (e.g. "hospital", "cctv_camera")
 *   search    string  partial name / assetCode match
 *   sort      string  "name" | "status" | "healthScore" | "updatedAt" (default)
 *   dir       "asc" | "desc" (default "desc")
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;

    const page  = Math.max(1, parseInt(searchParams.get("page")  || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const skip  = (page - 1) * limit;

    const category = searchParams.get("category") || undefined;
    const status   = searchParams.get("status")   || undefined;
    const zone     = searchParams.get("zone")      || undefined;
    const type     = searchParams.get("type")      || undefined;
    const search   = searchParams.get("search")    || undefined;
    const sort     = searchParams.get("sort")      || "updatedAt";
    const dir      = (searchParams.get("dir") === "asc" ? "asc" : "desc") as "asc" | "desc";

    // Build Prisma where clause
    const where: Record<string, any> = {};
    if (category) where.category = category;
    if (status)   where.status   = status;
    if (zone)     where.zoneId   = zone;
    if (type)     where.assetType = type;
    if (search) {
      where.OR = [
        { name:      { contains: search, mode: "insensitive" } },
        { assetCode: { contains: search, mode: "insensitive" } },
      ];
    }

    // Valid sort fields
    const validSorts: Record<string, string> = {
      name: "name", status: "status", healthScore: "healthScore",
      updatedAt: "updatedAt", assetCode: "assetCode",
    };
    const orderField = validSorts[sort] || "updatedAt";

    const [assets, total] = await Promise.all([
      prisma.cityAsset.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [orderField]: dir },
        select: {
          id: true, assetCode: true, name: true, assetType: true,
          category: true, lat: true, lng: true, zoneId: true, ward: true,
          status: true, healthScore: true, refType: true, refId: true,
          isDemo: true, lastSeenAt: true, updatedAt: true, metadata: true,
        },
      }),
      prisma.cityAsset.count({ where }),
    ]);

    // Load zone names in one shot
    const zoneIds = [...new Set(assets.map(a => a.zoneId).filter(Boolean))] as string[];
    const zones = zoneIds.length
      ? await prisma.zone.findMany({ where: { id: { in: zoneIds } }, select: { id: true, name: true } })
      : [];
    const zoneMap = new Map(zones.map(z => [z.id, z.name]));

    // Resolve live status for LINKED assets — batch by refType
    const enriched = await resolveLiveStatuses(assets);

    const result = enriched.map(a => ({
      ...a,
      zoneName: a.zoneId ? (zoneMap.get(a.zoneId) ?? null) : null,
    }));

    return NextResponse.json({
      assets: result,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("[api/assets] GET error:", err);
    return NextResponse.json({ error: "Failed to load assets" }, { status: 500 });
  }
}

// ── Live status resolution ─────────────────────────────────────────────────

type AssetRow = {
  id: string; assetCode: string; name: string; assetType: string;
  category: string; lat: number; lng: number; zoneId: string | null;
  ward: string | null; status: string; healthScore: number;
  refType: string | null; refId: string | null; isDemo: boolean;
  lastSeenAt: Date | null; updatedAt: Date; metadata: any;
};

async function resolveLiveStatuses(assets: AssetRow[]): Promise<AssetRow[]> {
  // Group by refType for batch queries
  const groups = new Map<string, AssetRow[]>();
  for (const a of assets) {
    if (!a.refType || !a.refId) continue;
    if (!groups.has(a.refType)) groups.set(a.refType, []);
    groups.get(a.refType)!.push(a);
  }

  const resolved = new Map<string, Partial<AssetRow>>();

  for (const [refType, group] of groups.entries()) {
    const ids = group.map(g => g.refId!);

    switch (refType) {
      case "CCTVFeed": {
        const feeds = await prisma.cCTVFeed.findMany({
          where: { id: { in: ids } },
          select: { id: true, status: true },
        });
        for (const feed of feeds) {
          const s = feed.status === "online" ? "HEALTHY" : "OFFLINE";
          resolved.set(feed.id, { status: s, healthScore: s === "HEALTHY" ? 95 : 10, lastSeenAt: new Date() });
        }
        break;
      }
      case "WaterSensor": {
        const sensors = await prisma.waterSensor.findMany({
          where: { id: { in: ids } },
          select: { id: true, waterLevel: true, timestamp: true },
        });
        for (const s of sensors) {
          const status = s.waterLevel > 160 ? "OFFLINE" : s.waterLevel > 120 ? "DEGRADED" : "HEALTHY";
          const health = status === "HEALTHY" ? Math.max(60, 100 - Math.round(s.waterLevel / 2))
                        : status === "DEGRADED" ? 40 : 10;
          resolved.set(s.id, { status, healthScore: health, lastSeenAt: s.timestamp });
        }
        break;
      }
      case "Junction": {
        const junctions = await prisma.junction.findMany({
          where: { id: { in: ids } },
          select: {
            id: true,
            trafficReadings: { orderBy: { timestamp: "desc" }, take: 1, select: { congestionLevel: true, timestamp: true } },
          },
        });
        for (const j of junctions) {
          const latest = j.trafficReadings[0];
          const cong = latest?.congestionLevel ?? 0;
          const status = cong > 0.85 ? "DEGRADED" : "HEALTHY";
          const health = Math.max(10, 100 - Math.round(cong * 100));
          resolved.set(j.id, { status, healthScore: health, lastSeenAt: latest?.timestamp ?? null });
        }
        break;
      }
      case "EmergencyUnit": {
        const units = await prisma.emergencyUnit.findMany({
          where: { id: { in: ids } },
          select: { id: true, isAvailable: true },
        });
        for (const u of units) {
          const status = u.isAvailable ? "HEALTHY" : "DEGRADED";
          resolved.set(u.id, { status, healthScore: u.isAvailable ? 90 : 55, lastSeenAt: new Date() });
        }
        break;
      }
      case "EnvironmentSensor": {
        const sensors = await prisma.environmentSensor.findMany({
          where: { id: { in: ids } },
          select: { id: true, aqi: true, updatedAt: true },
        });
        for (const s of sensors) {
          const originalAsset = group.find(a => a.refId === s.id);
          const status = originalAsset?.status === "HEALTHY" ? (s.aqi > 150 ? "DEGRADED" : "HEALTHY") : (originalAsset?.status ?? "OFFLINE");
          const health = status === "HEALTHY" ? Math.max(60, 100 - Math.round(s.aqi / 3))
                        : status === "DEGRADED" ? 50 : 10;
          resolved.set(s.id, { status, healthScore: health, lastSeenAt: s.updatedAt });
        }
        break;
      }
      case "GarbageBin": {
        const bins = await prisma.garbageBin.findMany({
          where: { id: { in: ids } },
          select: { id: true, status: true, fillPercentage: true, updatedAt: true },
        });
        for (const b of bins) {
          const status = b.status === "offline" ? "OFFLINE" : b.status === "overflowing" ? "DEGRADED" : "HEALTHY";
          const health = status === "HEALTHY" ? Math.max(50, 100 - b.fillPercentage)
                        : status === "DEGRADED" ? 30 : 5;
          resolved.set(b.id, { status, healthScore: health, lastSeenAt: b.updatedAt });
        }
        break;
      }
      case "StreetLight": {
        const lights = await prisma.streetLight.findMany({
          where: { id: { in: ids } },
          select: { id: true, status: true, updatedAt: true },
        });
        for (const l of lights) {
          const status = l.status === "offline" ? "OFFLINE" : l.status === "fault" ? "DEGRADED" : "HEALTHY";
          resolved.set(l.id, { status, healthScore: status === "HEALTHY" ? 90 : status === "DEGRADED" ? 45 : 5, lastSeenAt: l.updatedAt });
        }
        break;
      }
      case "PublicVehicle": {
        const vehicles = await prisma.publicVehicle.findMany({
          where: { id: { in: ids } },
          select: { id: true, status: true, updatedAt: true },
        });
        for (const v of vehicles) {
          const status = v.status === "offline" ? "OFFLINE" : v.status === "delayed" ? "DEGRADED" : "HEALTHY";
          resolved.set(v.id, { status, healthScore: status === "HEALTHY" ? 85 : status === "DEGRADED" ? 50 : 10, lastSeenAt: v.updatedAt });
        }
        break;
      }
    }
  }

  // Merge resolved statuses back into asset rows
  return assets.map(a => {
    if (!a.refId || !resolved.has(a.refId)) return a;
    const patch = resolved.get(a.refId)!;
    return { ...a, ...patch };
  });
}
