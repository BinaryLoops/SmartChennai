/**
 * STAR #10 — Citizen Services Telemetry Worker
 * Causal synthetic citizen demand generation.
 *
 * RULES:
 * - No random report creation every tick.
 * - Reports only created on causal CityEvent triggers.
 * - Uses event fingerprinting to prevent duplicate creation per event.
 * - Lifecycle progression based on realistic dwell times.
 * - No DB write explosions.
 */

import { PrismaClient, ServiceCategory, ServiceStatus } from "@prisma/client";
import { Server } from "socket.io";
import { TelemetryContext } from "./types";
import { generateReferenceCode, computeSlaDueAt, SERVICE_ROUTING, inferPriority } from "../../src/lib/citizenServices";

const prisma = new PrismaClient();

// Fingerprint cache: eventId+category → timestamp created
const createdFingerprints = new Set<string>();

// Last lifecycle tick
let lastLifecycleTick = 0;
const LIFECYCLE_INTERVAL_MS = 60_000; // advance lifecycle every 60s

// Last hotspot check
let lastHotspotCheck = 0;
const HOTSPOT_INTERVAL_MS = 300_000; // every 5 minutes

// Causal trigger config — which CityEvent types trigger which service categories
const CAUSAL_RULES: Array<{
  eventType: string;
  categories: ServiceCategory[];
  maxPerEvent: number;
  description: (zone: string) => string;
}> = [
  {
    eventType: "FLOOD_EVENT",
    categories: ["DRAINAGE", "WATER"],
    maxPerEvent: 3,
    description: (zone) => `Waterlogging and drainage blockage reported in ${zone}. Multiple areas affected.`,
  },
  {
    eventType: "FLOOD",
    categories: ["DRAINAGE"],
    maxPerEvent: 2,
    description: (zone) => `Flooding and drain overflow near ${zone}.`,
  },
  {
    eventType: "POWER_OUTAGE",
    categories: ["STREETLIGHT"],
    maxPerEvent: 2,
    description: (zone) => `Street lights not working in ${zone} following power disruption.`,
  },
  {
    eventType: "STREETLIGHT_FAILURE",
    categories: ["STREETLIGHT"],
    maxPerEvent: 1,
    description: (zone) => `Street light out in ${zone}.`,
  },
  {
    eventType: "TRANSIT_DISRUPTION",
    categories: ["TRANSIT"],
    maxPerEvent: 2,
    description: (zone) => `Bus stop service disruption in ${zone}. No buses arriving.`,
  },
];

// Synthetic session token for simulated reports (never exposed to citizens)
const SIMULATION_SESSION_TOKEN = "sim-worker-star10-synthetic-demo-v1";

export const citizenServicesGenerator = {
  async runTick(context: TelemetryContext, io: Server) {
    try {
      await processCausalTriggers();

      const now = Date.now();
      if (now - lastLifecycleTick >= LIFECYCLE_INTERVAL_MS) {
        await advanceLifecycles();
        lastLifecycleTick = now;
      }

      if (now - lastHotspotCheck >= HOTSPOT_INTERVAL_MS) {
        await detectHotspots(io);
        lastHotspotCheck = now;
      }
    } catch (err) {
      console.error("[citizenServices] tick error:", err);
    }
  },
};

/**
 * Look for recent relevant CityEvents and create causal citizen reports.
 * Uses fingerprinting to ensure one report cluster per event.
 */
async function processCausalTriggers() {
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);

  const recentEvents = await prisma.cityEvent.findMany({
    where: {
      timestamp: { gte: fiveMinAgo },
      status: "active",
      type: {
        in: CAUSAL_RULES.map(r => r.eventType),
      },
    },
    include: { Zone: { select: { id: true, name: true } } },
    take: 10,
  });

  for (const event of recentEvents) {
    const rule = CAUSAL_RULES.find(r => r.eventType === event.type);
    if (!rule) continue;

    for (const category of rule.categories) {
      const fingerprint = `${event.id}::${category}`;
      if (createdFingerprints.has(fingerprint)) continue;

      // Check DB for existing reports with this fingerprint (worker restart safety)
      const existing = await prisma.citizenServiceRequest.findFirst({
        where: {
          description: { contains: fingerprint.substring(0, 20) },
          sessionToken: SIMULATION_SESSION_TOKEN,
        },
      });
      if (existing) {
        createdFingerprints.add(fingerprint);
        continue;
      }

      createdFingerprints.add(fingerprint);

      // Create 1–maxPerEvent reports with slight coordinate jitter
      const count = 1 + Math.floor(Math.random() * rule.maxPerEvent);
      const baseLat = event.Zone?.id
        ? 13.0 + (Math.random() - 0.5) * 0.1
        : 13.05 + (Math.random() - 0.5) * 0.05;
      const baseLng = 80.2 + (Math.random() - 0.5) * 0.1;

      for (let i = 0; i < count; i++) {
        const lat = baseLat + (Math.random() - 0.5) * 0.005;
        const lng = baseLng + (Math.random() - 0.5) * 0.005;
        const desc = rule.description(event.Zone?.name ?? "this area");
        const priority = inferPriority(category, desc);
        const route = SERVICE_ROUTING[category];
        const refCode = generateReferenceCode();
        const submittedAt = new Date(event.timestamp.getTime() + Math.random() * 10 * 60 * 1000);
        const slaDueAt = computeSlaDueAt(category, priority, submittedAt);

        const req = await prisma.citizenServiceRequest.create({
          data: {
            referenceCode: refCode,
            sessionToken: SIMULATION_SESSION_TOKEN,
            category,
            description: desc + ` [sim:${fingerprint.substring(0, 20)}]`,
            lat,
            lng,
            zoneId: event.Zone?.id ?? null,
            status: "RECEIVED",
            priority,
            department: route.department,
            slaDueAt,
            submittedAt,
            receivedAt: new Date(submittedAt.getTime() + 60 * 1000),
          },
        });

        // Timeline entries
        await prisma.serviceRequestUpdate.createMany({
          data: [
            { requestId: req.id, status: "SUBMITTED", note: "Citizen report received via portal.", timestamp: submittedAt },
            { requestId: req.id, status: "RECEIVED", note: "Routed to " + route.department, timestamp: new Date(submittedAt.getTime() + 60 * 1000) },
          ],
        });

        // Create WorkOrder if required
        if (route.createsWorkOrder) {
          const wo = await prisma.workOrder.create({
            data: {
              zoneId: event.Zone?.id ?? null,
              category: category as string,
              priority,
              status: "OPEN",
              description: `Citizen service request: ${desc.substring(0, 200)}`,
              slaDueAt,
              assignedTeam: route.department,
              workOrderCode: `WO-CSR-${Date.now().toString(36).toUpperCase()}`,
            },
          });
          await prisma.citizenServiceRequest.update({
            where: { id: req.id },
            data: { workOrderId: wo.id },
          });
        }
      }

      console.log(`[citizenServices] Created ${count} causal report(s) for event ${event.id} (${event.type} → ${category})`);
    }
  }
}

/**
 * Advance pending service request lifecycles based on realistic dwell times.
 * Gradual, stateful progression — not random flipping.
 */
async function advanceLifecycles() {
  const now = new Date();

  // RECEIVED → VERIFIED after 5+ minutes
  const toVerify = await prisma.citizenServiceRequest.findMany({
    where: {
      status: "RECEIVED",
      receivedAt: { lte: new Date(now.getTime() - 5 * 60 * 1000) },
      sessionToken: SIMULATION_SESSION_TOKEN,
    },
    take: 5,
  });
  for (const r of toVerify) {
    await prisma.citizenServiceRequest.update({
      where: { id: r.id },
      data: { status: "VERIFIED", verifiedAt: now },
    });
    await prisma.serviceRequestUpdate.create({
      data: { requestId: r.id, status: "VERIFIED", note: "Report verified by citizen services desk." },
    });
  }

  // VERIFIED → ASSIGNED after 15+ minutes, if WorkOrder has crew
  const toAssign = await prisma.citizenServiceRequest.findMany({
    where: {
      status: "VERIFIED",
      verifiedAt: { lte: new Date(now.getTime() - 15 * 60 * 1000) },
      sessionToken: SIMULATION_SESSION_TOKEN,
      workOrderId: { not: null },
    },
    include: { workOrder: { select: { status: true, assignedCrewId: true } } },
    take: 5,
  });
  for (const r of toAssign) {
    if (r.workOrder && r.workOrder.status !== "OPEN") {
      await prisma.citizenServiceRequest.update({
        where: { id: r.id },
        data: { status: "ASSIGNED", assignedAt: now },
      });
      await prisma.serviceRequestUpdate.create({
        data: { requestId: r.id, status: "ASSIGNED", note: "Work order assigned to maintenance crew." },
      });
    }
  }

  // ASSIGNED → IN_PROGRESS after 30+ minutes
  const toInProgress = await prisma.citizenServiceRequest.findMany({
    where: {
      status: "ASSIGNED",
      assignedAt: { lte: new Date(now.getTime() - 30 * 60 * 1000) },
      sessionToken: SIMULATION_SESSION_TOKEN,
    },
    take: 5,
  });
  for (const r of toInProgress) {
    await prisma.citizenServiceRequest.update({
      where: { id: r.id },
      data: { status: "IN_PROGRESS", inProgressAt: now },
    });
    await prisma.serviceRequestUpdate.create({
      data: { requestId: r.id, status: "IN_PROGRESS", note: "Maintenance crew on-site. Work in progress." },
    });
  }

  // IN_PROGRESS → RESOLVED after 2+ hours
  const toResolve = await prisma.citizenServiceRequest.findMany({
    where: {
      status: "IN_PROGRESS",
      inProgressAt: { lte: new Date(now.getTime() - 2 * 60 * 60 * 1000) },
      sessionToken: SIMULATION_SESSION_TOKEN,
    },
    take: 3,
  });
  for (const r of toResolve) {
    await prisma.citizenServiceRequest.update({
      where: { id: r.id },
      data: { status: "RESOLVED", resolvedAt: now },
    });
    await prisma.serviceRequestUpdate.create({
      data: { requestId: r.id, status: "RESOLVED", note: "Issue resolved. Asset restored to service." },
    });
    // Also mark WorkOrder completed if linked
    if (r.workOrderId) {
      await prisma.workOrder.update({
        where: { id: r.workOrderId },
        data: { status: "COMPLETED", actualCompletion: now },
      }).catch(() => {});
    }
  }
}

/**
 * Detect hotspot clusters and emit a CityEvent if threshold exceeded.
 */
async function detectHotspots(io: Server) {
  const last24h = new Date(Date.now() - 24 * 3600 * 1000);

  const grouped = await prisma.citizenServiceRequest.groupBy({
    by: ["category", "zoneId"],
    _count: { id: true },
    where: {
      submittedAt: { gte: last24h },
      zoneId: { not: null },
    },
  });

  for (const g of grouped) {
    if (g._count.id >= 5 && g.zoneId) {
      // Check if we already fired this hotspot event recently
      const recentHotspot = await prisma.cityEvent.findFirst({
        where: {
          type: "SERVICE_HOTSPOT_DETECTED",
          zoneId: g.zoneId,
          metadata: { path: ["category"], equals: g.category },
          timestamp: { gte: new Date(Date.now() - 3600 * 1000) },
        },
      });
      if (!recentHotspot) {
        await prisma.cityEvent.create({
          data: {
            type: "SERVICE_HOTSPOT_DETECTED",
            severity: "MEDIUM",
            description: `Recurring ${g.category} reports detected in zone — ${g._count.id} reports in 24h`,
            source: "CitizenServices",
            zoneId: g.zoneId,
            metadata: { category: g.category, count: g._count.id },
          },
        });
        console.log(`[citizenServices] Hotspot detected: ${g.category} in zone ${g.zoneId} (${g._count.id} reports)`);
      }
    }
  }
}
