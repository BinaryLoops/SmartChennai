/**
 * STAR #10 — Citizen Service Intelligence Seed
 * Deterministic, idempotent seed using reference-code guard.
 * Self-contained — no imports from src/lib to avoid path alias issues in tsx.
 */

import { PrismaClient, ServiceCategory, ServiceStatus } from "@prisma/client";

const prisma = new PrismaClient();

const SEED_SESSION_TOKEN = "seed-demo-session-star10-v1";

// ── Inline helpers (copied from src/lib/citizenServices.ts) ─────────────────

interface ServiceRoute {
  department: string;
  createsWorkOrder: boolean;
  slaDays: { LOW: number; MEDIUM: number; HIGH: number; CRITICAL: number };
}

const SERVICE_ROUTING: Record<string, ServiceRoute> = {
  ROAD:           { department: "Public Works",          createsWorkOrder: true,  slaDays: { LOW: 14, MEDIUM: 7, HIGH: 3, CRITICAL: 1 } },
  WATER:          { department: "Water Operations",      createsWorkOrder: true,  slaDays: { LOW: 7, MEDIUM: 3, HIGH: 1, CRITICAL: 0.5 } },
  DRAINAGE:       { department: "Water / Public Works",  createsWorkOrder: true,  slaDays: { LOW: 7, MEDIUM: 3, HIGH: 1, CRITICAL: 0.5 } },
  STREETLIGHT:    { department: "Energy / Public Works", createsWorkOrder: true,  slaDays: { LOW: 7, MEDIUM: 3, HIGH: 1, CRITICAL: 0.25 } },
  WASTE:          { department: "Waste Operations",      createsWorkOrder: false, slaDays: { LOW: 3, MEDIUM: 2, HIGH: 1, CRITICAL: 0.5 } },
  TRAFFIC:        { department: "Traffic Operations",    createsWorkOrder: false, slaDays: { LOW: 5, MEDIUM: 2, HIGH: 0.5, CRITICAL: 0.1 } },
  CCTV:           { department: "Security / Operations", createsWorkOrder: true,  slaDays: { LOW: 7, MEDIUM: 3, HIGH: 1, CRITICAL: 0.5 } },
  PUBLIC_FACILITY:{ department: "Public Works",          createsWorkOrder: true,  slaDays: { LOW: 14, MEDIUM: 7, HIGH: 3, CRITICAL: 1 } },
  TRANSIT:        { department: "Transit Operations",    createsWorkOrder: false, slaDays: { LOW: 5, MEDIUM: 2, HIGH: 1, CRITICAL: 0.5 } },
  OTHER:          { department: "Citizen Services",      createsWorkOrder: false, slaDays: { LOW: 14, MEDIUM: 7, HIGH: 3, CRITICAL: 1 } },
};

function computeSlaDueAt(category: string, priority: string, submittedAt: Date): Date {
  const route = SERVICE_ROUTING[category];
  const days = (route?.slaDays as any)[priority] ?? 7;
  return new Date(submittedAt.getTime() + days * 24 * 3600 * 1000);
}

function inferPriority(desc: string): string {
  const d = desc.toLowerCase();
  if (d.includes("danger") || d.includes("urgent") || d.includes("accident") || d.includes("multiple")) return "HIGH";
  return "MEDIUM";
}

// ── Seed data ────────────────────────────────────────────────────────────────

interface SeedReq {
  category: ServiceCategory;
  description: string;
  lat: number; lng: number;
  hoursAgo: number;
  status: ServiceStatus;
  rating?: number;
}

const SEED_REQS: SeedReq[] = [
  { category: "STREETLIGHT",     description: "Street light at main junction near Anna Nagar bus stop not working for 3 days. Very dark at night.",             lat: 13.0827, lng: 80.2108, hoursAgo: 72,  status: "RESOLVED", rating: 5 },
  { category: "ROAD",            description: "Large pothole near T. Nagar signal causing accidents. Multiple vehicles damaged.",                                lat: 13.0384, lng: 80.2329, hoursAgo: 48,  status: "IN_PROGRESS" },
  { category: "DRAINAGE",        description: "Drain completely blocked near Adyar river. Water flooding the street.",                                           lat: 13.0012, lng: 80.2565, hoursAgo: 24,  status: "ASSIGNED" },
  { category: "WASTE",           description: "Garbage bin overflowing at Velachery market corner. Not collected for 2 days.",                                   lat: 12.9784, lng: 80.2209, hoursAgo: 12,  status: "RECEIVED" },
  { category: "WATER",           description: "Low water pressure in Mylapore area since morning. Tanks empty.",                                                 lat: 13.0368, lng: 80.2676, hoursAgo: 6,   status: "TRIAGED" },
  { category: "TRANSIT",         description: "Bus stop shelter at Tambaram damaged. No roof, raining heavily.",                                                 lat: 12.9249, lng: 80.1000, hoursAgo: 36,  status: "VERIFIED" },
  { category: "CCTV",            description: "CCTV camera at Park Town railway station entrance not functioning.",                                              lat: 13.0792, lng: 80.2748, hoursAgo: 96,  status: "RESOLVED", rating: 4 },
  { category: "STREETLIGHT",     description: "5 consecutive street lights non-functional on ECR near Thiruvanmiyur.",                                           lat: 12.9952, lng: 80.2686, hoursAgo: 18,  status: "ASSIGNED" },
  { category: "ROAD",            description: "Collapsed road divider at Guindy flyover causing traffic blockage.",                                              lat: 13.0067, lng: 80.2206, hoursAgo: 8,   status: "IN_PROGRESS" },
  { category: "DRAINAGE",        description: "Storm water drain blocked near Kodambakkam, waterlogging during rain.",                                           lat: 13.0511, lng: 80.2209, hoursAgo: 4,   status: "SUBMITTED" },
  { category: "PUBLIC_FACILITY", description: "Public park bench broken at Nungambakkam high road park. Children's area unsafe.",                               lat: 13.0569, lng: 80.2425, hoursAgo: 120, status: "CLOSED",   rating: 3 },
  { category: "TRAFFIC",         description: "Signal at Teynampet junction stuck on red for 10 minutes causing massive jam.",                                   lat: 13.0327, lng: 80.2519, hoursAgo: 2,   status: "RECEIVED" },
  { category: "STREETLIGHT",     description: "Dark stretch on OMR near Sholinganallur causing safety concerns.",                                                lat: 12.9007, lng: 80.2274, hoursAgo: 60,  status: "RECEIVED" },
  { category: "ROAD",            description: "Pothole causing injuries near Perambur bus depot.",                                                               lat: 13.1090, lng: 80.2458, hoursAgo: 200, status: "ASSIGNED" },
  { category: "WATER",           description: "Water pipe burst on Poonamallee High Road. Road flooded.",                                                        lat: 13.0716, lng: 80.1962, hoursAgo: 3,   status: "IN_PROGRESS" },
  { category: "DRAINAGE",        description: "Drainage blocked near Ambattur industrial estate. Sewage overflow.",                                              lat: 13.1143, lng: 80.1548, hoursAgo: 30,  status: "VERIFIED" },
];

export async function seedCitizenServices() {
  console.log("[seed] Seeding CitizenServiceRequests...");

  const zones = await prisma.zone.findMany({ take: 10, select: { id: true, name: true } });
  if (zones.length === 0) {
    console.log("[seed] No zones found — skipping citizen services seed");
    return;
  }

  for (let i = 0; i < SEED_REQS.length; i++) {
    const req = SEED_REQS[i];
    const referenceCode = `SC-SEED-${String(i + 1).padStart(4, "0")}`;

    // Idempotent guard
    const existing = await prisma.citizenServiceRequest.findUnique({ where: { referenceCode } });
    if (existing) { console.log(`[seed] Skip ${referenceCode}`); continue; }

    const submittedAt = new Date(Date.now() - req.hoursAgo * 3600 * 1000);
    const priority     = inferPriority(req.description);
    const route        = SERVICE_ROUTING[req.category];
    const slaDueAt     = computeSlaDueAt(req.category, priority, submittedAt);
    const zoneId       = zones[i % zones.length].id;

    // Timestamp chain
    const receivedAt    = new Date(submittedAt.getTime() + 5 * 60 * 1000);
    const isAfter       = (s: ServiceStatus) => ["VERIFIED","TRIAGED","ASSIGNED","IN_PROGRESS","RESOLVED","CLOSED"].includes(req.status);
    const verifiedAt    = ["VERIFIED","TRIAGED","ASSIGNED","IN_PROGRESS","RESOLVED","CLOSED"].includes(req.status)
                          ? new Date(submittedAt.getTime() + 30 * 60 * 1000) : null;
    const triagedAt     = ["TRIAGED","ASSIGNED","IN_PROGRESS","RESOLVED","CLOSED"].includes(req.status)
                          ? new Date(submittedAt.getTime() + 45 * 60 * 1000) : null;
    const assignedAt    = ["ASSIGNED","IN_PROGRESS","RESOLVED","CLOSED"].includes(req.status)
                          ? new Date(submittedAt.getTime() + 2 * 3600 * 1000) : null;
    const inProgressAt  = ["IN_PROGRESS","RESOLVED","CLOSED"].includes(req.status)
                          ? new Date(submittedAt.getTime() + 4 * 3600 * 1000) : null;
    const resolvedAt    = ["RESOLVED","CLOSED"].includes(req.status)
                          ? new Date(submittedAt.getTime() + Math.floor(req.hoursAgo * 0.7) * 3600 * 1000) : null;
    const closedAt      = req.status === "CLOSED" && resolvedAt
                          ? new Date(resolvedAt.getTime() + 2 * 3600 * 1000) : null;
    const ratedAt       = req.rating && closedAt ? new Date(closedAt.getTime() + 3600 * 1000) : null;

    // Create WorkOrder if route requires it
    let workOrderId: string | null = null;
    if (route.createsWorkOrder) {
      const wo = await prisma.workOrder.create({
        data: {
          workOrderCode:   `WO-CSR-SEED-${String(i + 1).padStart(4, "0")}`,
          category:        req.category as string,
          priority,
          status:          resolvedAt ? "COMPLETED" : inProgressAt ? "IN_PROGRESS" : "OPEN",
          description:     `[Seed] ${req.description.substring(0, 200)}`,
          slaDueAt,
          assignedTeam:    route.department,
          zoneId,
          actualCompletion: resolvedAt ?? null,
        },
      });
      workOrderId = wo.id;
    }

    const created = await prisma.citizenServiceRequest.create({
      data: {
        referenceCode,
        sessionToken:   SEED_SESSION_TOKEN,
        category:       req.category,
        description:    req.description,
        lat: req.lat, lng: req.lng,
        zoneId,
        status:         req.status,
        priority,
        department:     route.department,
        slaDueAt,
        submittedAt,
        receivedAt,
        verifiedAt,
        triagedAt,
        assignedAt,
        inProgressAt,
        resolvedAt,
        closedAt,
        workOrderId,
        rating:         req.rating ?? null,
        ratedAt,
        ratingFeedback: req.rating === 5 ? "Excellent — fixed quickly!"
                        : req.rating === 4 ? "Good service, resolved well."
                        : req.rating === 3 ? "Took longer than expected but resolved."
                        : null,
      },
    });

    // Timeline
    const timeline: Array<{ status: string; note: string; timestamp: Date }> = [
      { status: "SUBMITTED",   note: "Report received via citizen portal.",              timestamp: submittedAt },
      { status: "RECEIVED",    note: `Routed to ${route.department}`,                    timestamp: receivedAt  },
    ];
    if (verifiedAt)   timeline.push({ status: "VERIFIED",    note: "Report verified by desk officer.",        timestamp: verifiedAt });
    if (triagedAt)    timeline.push({ status: "TRIAGED",     note: "Issue triaged and prioritized.",          timestamp: triagedAt  });
    if (assignedAt)   timeline.push({ status: "ASSIGNED",    note: "Maintenance crew assigned.",              timestamp: assignedAt  });
    if (inProgressAt) timeline.push({ status: "IN_PROGRESS", note: "Crew on-site, work in progress.",        timestamp: inProgressAt });
    if (resolvedAt)   timeline.push({ status: "RESOLVED",    note: "Issue resolved and asset restored.",     timestamp: resolvedAt  });
    if (closedAt)     timeline.push({ status: "CLOSED",      note: `Citizen rated: ${req.rating}/5 ⭐`,    timestamp: closedAt    });

    await prisma.serviceRequestUpdate.createMany({
      data: timeline.map(t => ({ requestId: created.id, status: t.status, note: t.note, timestamp: t.timestamp })),
    });

    console.log(`[seed] Created ${referenceCode} (${req.category}, ${req.status})`);
  }

  console.log("[seed] CitizenServiceRequests seeded ✔");
}

if (require.main === module) {
  seedCitizenServices()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
}
