import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ServiceCategory, ServiceStatus } from "@prisma/client";
import {
  SERVICE_ROUTING,
  generateReferenceCode,
  computeSlaDueAt,
  inferPriority,
} from "@/lib/citizenServices";
import { getHaversineDistance } from "@/lib/distance";

const submitSchema = z.object({
  category: z.nativeEnum(ServiceCategory),
  description: z.string().min(5).max(2000),
  lat: z.number().min(12.75).max(13.40),
  lng: z.number().min(79.90).max(80.45),
  sessionToken: z.string().min(10).max(128),
});

/**
 * POST /api/citizen/reports
 * Submit a new citizen service request.
 * Anonymous — uses sessionToken from client.
 */
export async function POST(req: NextRequest) {
  try {
    let raw: unknown;
    try { raw = await req.json(); } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = submitSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { category, description, lat, lng, sessionToken } = parsed.data;

    // 1. Detect nearby recent duplicate requests (same category, 150m, 24h)
    const oneDayAgo = new Date(Date.now() - 24 * 3600 * 1000);
    const DEDUP_RADIUS_KM = 0.15; // 150m
    const nearbyRequests = await prisma.citizenServiceRequest.findMany({
      where: {
        category,
        submittedAt: { gte: oneDayAgo },
        status: { notIn: ["CLOSED", "REJECTED", "RESOLVED"] },
      },
      select: { id: true, referenceCode: true, lat: true, lng: true, status: true },
      take: 20,
    });

    let nearbyDuplicate: typeof nearbyRequests[0] | null = null;
    for (const r of nearbyRequests) {
      const dist = getHaversineDistance(lat, lng, r.lat, r.lng);
      if (dist <= DEDUP_RADIUS_KM) {
        nearbyDuplicate = r;
        break;
      }
    }

    // 2. Resolve nearest relevant CityAsset
    const ASSET_MATCH_RADIUS_KM = 0.1; // 100m
    const relevantAssetTypes = getCategoryAssetTypes(category);
    let matchedAsset: { id: string; name: string; assetCode: string; zoneId: string | null; ward: string | null } | null = null;

    if (relevantAssetTypes.length > 0) {
      const candidates = await prisma.cityAsset.findMany({
        where: { assetType: { in: relevantAssetTypes }, status: { not: "OFFLINE" } },
        select: { id: true, name: true, assetCode: true, lat: true, lng: true, zoneId: true, ward: true },
        take: 50,
      });
      let minDist = Infinity;
      for (const a of candidates) {
        const d = getHaversineDistance(lat, lng, a.lat, a.lng);
        if (d < ASSET_MATCH_RADIUS_KM && d < minDist) {
          minDist = d;
          matchedAsset = a;
        }
      }
    }

    // 3. Resolve zone from nearest zone centroid
    const zones = await prisma.zone.findMany({
      select: { id: true, name: true, boundary: true },
    });
    let zoneId: string | null = matchedAsset?.zoneId ?? null;
    // Use asset zone if available, otherwise skip (boundary check is complex)

    // 4. Determine routing + SLA
    const priority = inferPriority(category, description);
    const route = SERVICE_ROUTING[category];
    const referenceCode = generateReferenceCode();
    const slaDueAt = computeSlaDueAt(category, priority, new Date());

    // 5. Create CitizenServiceRequest
    const serviceRequest = await prisma.citizenServiceRequest.create({
      data: {
        referenceCode,
        sessionToken,
        category,
        description,
        lat,
        lng,
        zoneId: zoneId ?? null,
        ward: matchedAsset?.ward ?? null,
        assetId: matchedAsset?.id ?? null,
        status: "SUBMITTED",
        priority,
        department: route.department,
        slaDueAt,
        receivedAt: new Date(), // auto-acknowledge immediately
      },
    });

    // 6. Create initial timeline entry
    await prisma.serviceRequestUpdate.create({
      data: {
        requestId: serviceRequest.id,
        status: "SUBMITTED",
        note: "Report received and queued for processing.",
      },
    });

    // 7. Auto-advance to RECEIVED status
    await prisma.citizenServiceRequest.update({
      where: { id: serviceRequest.id },
      data: { status: "RECEIVED", receivedAt: new Date() },
    });
    await prisma.serviceRequestUpdate.create({
      data: {
        requestId: serviceRequest.id,
        status: "RECEIVED",
        note: "Request received and assigned to " + route.department,
      },
    });

    // 8. Create WorkOrder if routing requires it
    let workOrderCode: string | null = null;
    if (route.createsWorkOrder) {
      const wo = await prisma.workOrder.create({
        data: {
          assetId: matchedAsset?.id ?? null,
          zoneId: zoneId ?? null,
          category: category as string,
          priority,
          status: "OPEN",
          description: `Citizen report: ${description.substring(0, 200)}`,
          slaDueAt,
          assignedTeam: route.department,
          workOrderCode: `WO-CSR-${Date.now().toString(36).toUpperCase()}`,
        },
      });
      workOrderCode = wo.workOrderCode;
      // Link service request to work order
      await prisma.citizenServiceRequest.update({
        where: { id: serviceRequest.id },
        data: { workOrderId: wo.id },
      });
    }

    return NextResponse.json({
      referenceCode,
      status: "RECEIVED",
      department: route.department,
      slaDueAt,
      linkedAsset: matchedAsset ? { name: matchedAsset.name, code: matchedAsset.assetCode } : null,
      workOrderCode,
      nearbyDuplicate: nearbyDuplicate
        ? { referenceCode: nearbyDuplicate.referenceCode, status: nearbyDuplicate.status }
        : null,
      message: "Service request received and routed to " + route.department,
    }, { status: 201 });

  } catch (err: any) {
    console.error("[POST /api/citizen/reports]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * GET /api/citizen/reports
 * List own requests by sessionToken (header: x-session-token).
 */
export async function GET(req: NextRequest) {
  try {
    const sessionToken = req.headers.get("x-session-token");
    if (!sessionToken) {
      return NextResponse.json({ error: "Session token required" }, { status: 401 });
    }

    const requests = await prisma.citizenServiceRequest.findMany({
      where: { sessionToken },
      orderBy: { submittedAt: "desc" },
      take: 50,
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
        resolvedAt: true,
        updatedAt: true,
        rating: true,
        asset: { select: { name: true, assetCode: true } },
        zone: { select: { name: true } },
      },
    });

    return NextResponse.json({ requests });
  } catch (err: any) {
    console.error("[GET /api/citizen/reports]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function getCategoryAssetTypes(category: ServiceCategory): string[] {
  switch (category) {
    case "STREETLIGHT": return ["STREETLIGHT", "StreetLight"];
    case "WATER": return ["WATER_SENSOR", "PIPE", "PUMP_STATION"];
    case "DRAINAGE": return ["DRAIN", "WATER_SENSOR"];
    case "TRAFFIC": return ["JUNCTION", "SIGNAL"];
    case "CCTV": return ["CCTV"];
    case "TRANSIT": return ["BUS_STOP", "TRANSIT_STOP"];
    case "WASTE": return ["GARBAGE_BIN", "WASTE_BIN"];
    default: return [];
  }
}
