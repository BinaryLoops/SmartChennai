/**
 * Phase 1 — Sensor Simulation Engine.
 *
 * Standalone worker (run with `npm run worker`), independent of the Next.js
 * server. Generates realistic traffic/water readings on a timer and emits
 * them over Socket.io so the dashboard updates live without polling.
 *
 * This file is a starting skeleton — see the roadmap's Phase 1 prompt for
 * the full spec (peak-hour curve, monsoon toggle, incident auto-generation,
 * shared TypeScript types with the frontend).
 */

import { PrismaClient } from "@prisma/client";
import { Server } from "socket.io";

const prisma = new PrismaClient();
const io = new Server(4001, { cors: { origin: "*" } });

const TICK_MS = 5000;

// Simple day-shaped congestion curve: two peaks (morning + evening).
function peakHourCurve(hour: number): number {
  const morning = Math.exp(-((hour - 9) ** 2) / 4);
  const evening = Math.exp(-((hour - 18) ** 2) / 4);
  return Math.min(1, morning + evening + 0.15);
}

async function tick() {
  const hour = new Date().getHours() + new Date().getMinutes() / 60;
  const baseCongestion = peakHourCurve(hour);

  const junctions = await prisma.junction.findMany({ select: { id: true } });

  for (const junction of junctions) {
    const noise = (Math.random() - 0.5) * 0.15;
    const congestionLevel = Math.min(1, Math.max(0, baseCongestion + noise));
    const vehiclesPerHour = Math.round(congestionLevel * 11000);
    const avgSpeed = Math.max(1.5, 45 * (1 - congestionLevel));

    const reading = await prisma.trafficReading.create({
      data: { junctionId: junction.id, vehiclesPerHour, avgSpeed, congestionLevel },
    });

    io.emit("traffic:update", reading);
  }

  // 10% chance every tick to spawn an incident — tune this down for demo
  // stability, or trigger it manually from an admin toggle.
  if (Math.random() < 0.02) {
    const junction = junctions[Math.floor(Math.random() * junctions.length)];
    const j = await prisma.junction.findUnique({ where: { id: junction.id } });
    if (j) {
      const incident = await prisma.incident.create({
        data: {
          type: Math.random() < 0.5 ? "traffic" : "fire",
          lat: j.lat,
          lng: j.lng,
          severity: 1 + Math.floor(Math.random() * 5),
          source: "sensor",
        },
      });
      io.emit("incident:new", incident);
      console.log(`[worker] new incident ${incident.id} at ${j.name}`);
    }
  }
}

console.log("[worker] Smart Chennai sensor simulator started on ws://localhost:4001");
setInterval(tick, TICK_MS);
setInterval(() => console.log("[worker] heartbeat", new Date().toISOString()), 30000);
