/**
 * Phase 4.5 — Scalable Incident Intake Queue Worker.
 *
 * Standalone worker process (run with `npm run worker:intake`).
 * Consumes incident submission jobs from BullMQ "incidents" queue:
 *  1. Deduplicates against open incidents within 50m / 5-min window.
 *  2. If duplicate found: increments reportedBy counter, recalculates MCDA score, emits incident:updated.
 *  3. If no duplicate: calculates MCDA priority score, creates new Incident in PostgreSQL, emits incident:new.
 *  4. Broadcasts via Socket.io Redis adapter across all server instances.
 */

import { Worker, type Job } from "bullmq";
import { PrismaClient } from "@prisma/client";
import { Emitter } from "@socket.io/redis-emitter";
import { INCIDENTS_QUEUE_NAME, type IncidentJobData, type IncidentJobResult } from "../src/lib/queue";
import { createRedisClient } from "../src/lib/redis";
import { getHaversineDistance } from "../src/lib/distance";
import { calculateMCDAPriority } from "../src/lib/mcda";
import { SOCKET_EVENTS, type IncidentPayload } from "../packages/types";

const prisma = new PrismaClient();

// Dedicated Redis clients for the worker and the Redis emitter
const workerRedis = createRedisClient();
const emitterRedis = createRedisClient();
const emitter = new Emitter(emitterRedis);

// Cache junctions for fast location-criticality calculations
let cachedJunctions: { lat: number; lng: number }[] = [];

async function refreshJunctions() {
  try {
    cachedJunctions = await prisma.junction.findMany({
      select: { lat: true, lng: true },
    });
  } catch (err) {
    console.error("[intake-worker] Failed to cache junctions:", err);
  }
}

function findDistanceToNearestJunction(lat: number, lng: number): number {
  if (cachedJunctions.length === 0) return 1.0; // Fallback 1 km
  let min = Infinity;
  for (const j of cachedJunctions) {
    const d = getHaversineDistance(lat, lng, j.lat, j.lng);
    if (d < min) min = d;
  }
  return min;
}

/**
 * Main Job Processor
 */
async function processIncidentJob(
  job: Job<IncidentJobData, IncidentJobResult>
): Promise<IncidentJobResult> {
  const { referenceId, type, lat, lng, severity = 2, source = "citizen", description } = job.data;

  console.log(`[intake-worker] Processing job ${job.id} (ref: ${referenceId}, type: ${type})`);

  // 1. Duplicate Detection Check:
  // Search for OPEN incident of SAME TYPE reported within the last 5 minutes
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const openCandidates = await prisma.incident.findMany({
    where: {
      type,
      status: { not: "resolved" },
      reportedAt: { gte: fiveMinutesAgo },
    },
    orderBy: { reportedAt: "desc" },
  });

  // Calculate Haversine distance to candidates (50 meters = 0.050 km)
  const DUPLICATE_RADIUS_KM = 0.050; // 50m
  let duplicateIncident = null;
  let nearestDistanceKm = Infinity;

  for (const candidate of openCandidates) {
    const distKm = getHaversineDistance(lat, lng, candidate.lat, candidate.lng);
    if (distKm <= DUPLICATE_RADIUS_KM && distKm < nearestDistanceKm) {
      duplicateIncident = candidate;
      nearestDistanceKm = distKm;
    }
  }

  const distToJunctionKm = findDistanceToNearestJunction(lat, lng);

  // 2A. DUPLICATE FOUND: Merge into existing Incident
  if (duplicateIncident) {
    const updatedCount = duplicateIncident.reportedBy + 1;
    const mergedSeverity = Math.max(duplicateIncident.severity, severity);

    // Recalculate MCDA priority with upgraded reportedBy count and highest severity
    const mcda = calculateMCDAPriority({
      severity: mergedSeverity,
      source: duplicateIncident.source,
      reportedBy: updatedCount,
      distanceToNearestJunctionKm: distToJunctionKm,
    });

    const updated = await prisma.incident.update({
      where: { id: duplicateIncident.id },
      data: {
        reportedBy: { increment: 1 },
        severity: mergedSeverity,
        priorityScore: mcda.score,
      },
    });

    console.log(
      `[intake-worker] MERGED into existing incident ${updated.id} (${nearestDistanceKm * 1000 | 0}m away). ` +
      `New reportedBy count: ${updated.reportedBy}, updated priority: ${updated.priorityScore}`
    );

    // Broadcast incident:updated over Socket.io
    const payload: IncidentPayload = {
      id: updated.id,
      type: updated.type,
      severity: updated.severity,
      lat: updated.lat,
      lng: updated.lng,
      source: updated.source,
      status: updated.status,
      reportedAt: updated.reportedAt.toISOString(),
      reportedBy: updated.reportedBy,
      priorityScore: updated.priorityScore ?? mcda.score,
      description: updated.description ?? undefined,
      referenceId: updated.referenceId ?? undefined,
    };

    emitter.emit(SOCKET_EVENTS.incidentUpdated, payload);

    return {
      status: "merged",
      incidentId: updated.id,
      referenceId,
      reportedBy: updated.reportedBy,
      priorityScore: updated.priorityScore ?? mcda.score,
    };
  }

  // 2B. NO DUPLICATE FOUND: Create new Incident row in PostgreSQL
  const mcda = calculateMCDAPriority({
    severity,
    source,
    reportedBy: 1,
    distanceToNearestJunctionKm: distToJunctionKm,
  });

  const newIncident = await prisma.incident.create({
    data: {
      type,
      lat,
      lng,
      severity,
      source,
      status: "reported" as import("@prisma/client").IncidentStatus,
      reportedBy: 1,
      description,
      priorityScore: mcda.score,
      referenceId,
    },
  });

  console.log(
    `[intake-worker] CREATED new incident ${newIncident.id} (ref: ${referenceId}). ` +
    `MCDA Priority: ${mcda.score} (${mcda.band})`
  );

  // Broadcast incident:new over Socket.io
  const payload: IncidentPayload = {
    id: newIncident.id,
    type: newIncident.type,
    severity: newIncident.severity,
    lat: newIncident.lat,
    lng: newIncident.lng,
    source: newIncident.source,
    status: newIncident.status,
    reportedAt: newIncident.reportedAt.toISOString(),
    reportedBy: newIncident.reportedBy,
    priorityScore: newIncident.priorityScore ?? mcda.score,
    description: newIncident.description ?? undefined,
    referenceId: newIncident.referenceId ?? undefined,
  };

  emitter.emit(SOCKET_EVENTS.incidentNew, payload);

  return {
    status: "created",
    incidentId: newIncident.id,
    referenceId,
    reportedBy: 1,
    priorityScore: mcda.score,
  };
}

async function main() {
  await refreshJunctions();
  // Refresh junction cache every 5 minutes
  setInterval(refreshJunctions, 5 * 60 * 1000);

  const worker = new Worker<IncidentJobData, IncidentJobResult>(
    INCIDENTS_QUEUE_NAME,
    processIncidentJob,
    {
      connection: workerRedis,
      concurrency: 5, // Process up to 5 concurrent reports
    }
  );

  worker.on("ready", () => {
    console.log(`[intake-worker] Incident intake worker ready. Listening on queue '${INCIDENTS_QUEUE_NAME}'...`);
  });

  worker.on("completed", (job, result) => {
    console.log(`[intake-worker] Job ${job.id} completed: ${result.status} incident ${result.incidentId}`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[intake-worker] Job ${job?.id} FAILED:`, err.message);
  });

  // Graceful shutdown handling
  const shutdown = async (signal: string) => {
    console.log(`[intake-worker] Received ${signal}, closing worker gracefully...`);
    await worker.close();
    await prisma.$disconnect();
    workerRedis.disconnect();
    emitterRedis.disconnect();
    console.log("[intake-worker] Shutdown complete.");
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

if (require.main === module) {
  main().catch((err) => {
    console.error("[intake-worker] Fatal error:", err);
    process.exit(1);
  });
}
