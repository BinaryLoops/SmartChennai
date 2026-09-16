/**
 * Phase 1 — Sensor Simulation Engine.
 *
 * Standalone worker (run with `npm run worker`), independent of the Next.js
 * server. Generates realistic traffic/water readings every 5 s, models
 * morning (8–10 AM) and evening (5–8 PM) peaks, occasional traffic spikes,
 * a persisted "simulate monsoon" water mode, and auto-generated incidents
 * (10% chance every 2 minutes). Everything is emitted over Socket.io on
 * :4001 using the shared contracts in packages/types.
 */

import { PrismaClient } from "@prisma/client";
import { runAdvancedCorrelations } from "./simulation_extension";
import { runAssetSimulation } from "./asset_simulation";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createRedisClient } from "../src/lib/redis";
// STAR ADD-ON #2
import { environmentGenerator } from "./telemetry/environment";
import { wasteGenerator } from "./telemetry/waste";
import { energyGenerator } from "./telemetry/energy";
import { TelemetryContext } from "./telemetry/types";
import { CityHealthPayload } from "../packages/types";
import { emitEventTransition } from "./event_fabric";

// STAR ADD-ON #3
import { ScenarioEngine } from "./scenarios/engine";

import {
  SOCKET_EVENTS,
  riskLevelFor,
  type ClientToServerEvents,
  type IncidentPayload,
  type ServerToClientEvents,
  type SimulationSettingsPayload,
  type TrafficUpdatePayload,
  type WaterUpdatePayload,
} from "../packages/types";

const prisma = new PrismaClient();

const DEFAULT_TICK_MS = 5_000;
const DEMO_TICK_MS = 1_000;
const DEMO_HOUR_INCREMENT = 0.2; // 12 minutes per tick (24 hours in 2 minutes)

let currentTickMs = DEFAULT_TICK_MS;
let isDemoMode = false;
let demoHour = 8; // Start at 8 AM for demo

const INCIDENT_INTERVAL_MS = 120_000;
const DEMO_INCIDENT_INTERVAL_MS = 10_000;
const INCIDENT_CHANCE = 0.1; // per interval
const DEMO_INCIDENT_CHANCE = 0.8; // high chance in demo mode
const HEARTBEAT_MS = 30_000;
const MAX_VEHICLES_PER_HOUR = 12_000;
const SPIKE_CHANCE = 0.015; // per junction per tick
const SPIKE_TICKS = 2;
const MAX_WATER_CM = 250;

/** Standard normal sample (Box–Muller). */
export function gaussian(std = 1): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * std;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/**
 * Day-shaped congestion curve: morning peak centered 9 AM (8–10),
 * evening peak centered 18:30 spanning 5–8 PM, on a low night baseline.
 * Returns a 0–1 congestion factor.
 */
export function peakHourCurve(hour: number): number {
  const morning = 0.62 * Math.exp(-((hour - 9) ** 2) / (2 * 0.9 ** 2));
  const evening = 0.75 * Math.exp(-((hour - 18.5) ** 2) / (2 * 1.3 ** 2));
  return clamp(0.12 + morning + evening, 0, 1);
}

interface JunctionProfile {
  id: string;
  name: string;
  zoneId: string;
  lat: number;
  lng: number;
  /** Per-junction road capacity, 8000–12000 veh/h. */
  capacity: number;
  /** How strongly this junction reacts to the day curve, 0.7–1.15. */
  peakWeight: number;
}

interface WaterSensorProfile {
  id: string;
  zoneName: string;
  zoneId: string;
  lat: number;
  lng: number;
  baseline: number;
  level: number;
}

const spikeState = new Map<string, { ticksLeft: number; multiplier: number }>();

export function junctionCongestion(
  profile: JunctionProfile,
  hour: number,
): { congestion: number; spiked: boolean } {
  const base = peakHourCurve(hour) * profile.peakWeight;
  const noisy = clamp(base + gaussian(0.03), 0, 1);

  let spiked = false;
  const spike = spikeState.get(profile.id);
  if (spike) {
    spiked = true;
    spike.ticksLeft -= 1;
    if (spike.ticksLeft <= 0) spikeState.delete(profile.id);
  } else if (Math.random() < SPIKE_CHANCE) {
    spikeState.set(profile.id, {
      ticksLeft: SPIKE_TICKS,
      multiplier: 1.6 + Math.random() * 0.8,
    });
    spiked = true;
  }

  const multiplier = spikeState.get(profile.id)?.multiplier ?? 1;
  return { congestion: clamp(noisy * multiplier, 0, 1), spiked };
}

/** One 5-second simulation tick. Returns emitted payload counts. */
export async function tick(
  junctions: JunctionProfile[],
  sensors: WaterSensorProfile[],
  hour: number,
  causalMods: any,
  io: Server<any, any, any, any>
): Promise<{ traffic: TrafficUpdatePayload[]; water: WaterUpdatePayload[] }> {
  const settings = await prisma.simulationSetting.findUnique({
    where: { key: "global" },
  });
  const monsoon = settings?.monsoonEnabled ?? false;
  const timestamp = new Date();

  // --- Operational Interventions (Traffic) ---
  const overrides = await prisma.signalOverride.findMany();
  const activeOverrides = new Map<string, any>();
  
  for (const ov of overrides) {
    if (ov.expiresAt && ov.expiresAt < timestamp) {
      await prisma.signalOverride.delete({ where: { id: ov.id } });
      await prisma.auditLog.create({
        data: {
          actionType: "SIGNAL_AUTO_EXPIRED",
          junctionId: ov.junctionId,
          oldValues: { state: "OVERRIDE" },
          newValues: { state: "NORMAL" }
        }
      });
      console.log(`[worker] signal override expired for junction ${ov.junctionId}`);
    } else {
      activeOverrides.set(ov.junctionId, ov);
    }
  }

  // --- Traffic ---
  const trafficReadings: {
    junctionId: string;
    vehiclesPerHour: number;
    avgSpeed: number;
    congestionLevel: number;
  }[] = [];
  const trafficPayloads: TrafficUpdatePayload[] = [];

  for (const j of junctions) {
    let { congestion, spiked } = junctionCongestion(j, hour);
    
    // SIMULATION/DEMO BEHAVIOR:
    // If an operator has applied a signal override, we simulate the outcome by
    // drastically reducing the congestion level (improving traffic flow).
    const override = activeOverrides.get(j.id);
    if (override) {
      congestion = congestion * 0.4; // 60% reduction in congestion
    }

    // Apply STAR ADD-ON #3 causal modifier: baseline * (1 + modifier)
    if (causalMods?.trafficFriction) {
      congestion = congestion * (1 + causalMods.trafficFriction);
    }

    const vehiclesPerHour = Math.round(
      clamp(congestion * j.capacity, 0, MAX_VEHICLES_PER_HOUR),
    );
    const congestionPercent = Math.round(congestion * 100);
    const avgSpeed = Math.max(2, 45 * (1 - congestion));

    trafficReadings.push({ junctionId: j.id, vehiclesPerHour, avgSpeed, congestionLevel: congestion });
    trafficPayloads.push({
      junctionId: j.id,
      junctionName: j.name,
      zoneId: j.zoneId,
      lat: j.lat,
      lng: j.lng,
      vehiclesPerHour,
      avgSpeedKph: Math.round(avgSpeed * 10) / 10,
      congestionLevel: Math.round(congestion * 1000) / 1000,
      spiked,
      timestamp: timestamp.toISOString(),
    });
    
    // Emit City Event for Traffic
    if (congestion > 0.85) {
      // Intentionally not awaiting here to avoid blocking the simulation loop
      emitEventTransition(prisma, io, {
        type: "TRAFFIC",
        severity: "CRITICAL",
        description: `Junction ${j.name} congestion reached ${congestionPercent}% (${vehiclesPerHour} veh/h)`,
        assetId: j.id,
        zoneId: j.zoneId,
        metadata: { lat: j.lat, lng: j.lng }
      });
    } else if (congestion > 0.70) {
      emitEventTransition(prisma, io, {
        type: "TRAFFIC",
        severity: "HIGH",
        description: `Junction ${j.name} experiencing heavy traffic (${congestionPercent}%)`,
        assetId: j.id,
        zoneId: j.zoneId,
        metadata: { lat: j.lat, lng: j.lng }
      });
    } else {
      emitEventTransition(prisma, io, {
        type: "TRAFFIC",
        severity: "NORMAL",
        description: `Traffic at ${j.name} normalized (${congestionPercent}%)`,
        assetId: j.id,
        zoneId: j.zoneId,
        metadata: { lat: j.lat, lng: j.lng }
      });
    }
  }

  await prisma.trafficReading.createMany({ data: trafficReadings });

  // --- Water ---
  const waterPayloads: WaterUpdatePayload[] = [];
  const waterReadings: { sensorId: string; waterLevel: number; timestamp: Date }[] = [];

  await Promise.all(
    sensors.map(async (sensor) => {
      if (monsoon) {
        // Progressive rise: 1.5–3 cm per tick with noise.
        sensor.level = clamp(sensor.level + 1.5 + Math.random() * 1.5 + gaussian(0.2), 0, MAX_WATER_CM);
      } else {
        // Decay toward the sensor's baseline with small noise.
        const diurnal = 1 + 0.12 * Math.sin((hour / 24) * 2 * Math.PI);
        const target = sensor.baseline * diurnal;
        sensor.level = clamp(
          sensor.level + (target - sensor.level) * 0.05 + gaussian(0.3),
          0,
          MAX_WATER_CM,
        );
      }
      
      // Apply STAR ADD-ON #3 causal modifier for water level
      if (causalMods?.waterLevelMultiplier) {
         // Gradual application to target over tick to simulate slow rise
         const simulatedTarget = sensor.level * (1 + causalMods.waterLevelMultiplier);
         sensor.level = sensor.level + (simulatedTarget - sensor.level) * 0.05;
      }
      
      const waterLevelCm = Math.round(sensor.level * 10) / 10;

      await prisma.waterSensor.update({
        where: { id: sensor.id },
        data: { waterLevel: waterLevelCm, timestamp },
      });

      waterReadings.push({ sensorId: sensor.id, waterLevel: waterLevelCm, timestamp });

      waterPayloads.push({
        sensorId: sensor.id,
        sensorName: `${sensor.zoneName} W-${sensor.zoneName.slice(0, 2)}`,
        zoneId: sensor.zoneId,
        lat: sensor.lat,
        lng: sensor.lng,
        waterLevelCm,
        riskLevel: riskLevelFor(waterLevelCm),
        monsoon,
        timestamp: timestamp.toISOString(),
      });
      
      // Emit City Event for Water
      if (waterLevelCm > 150) {
        emitEventTransition(prisma, io, {
          type: "WATER",
          severity: "CRITICAL",
          description: `Water level at ${sensor.zoneName} reached ${waterLevelCm} cm`,
          assetId: sensor.id,
          zoneId: sensor.zoneId,
          metadata: { lat: sensor.lat, lng: sensor.lng }
        });
      } else if (waterLevelCm > 100) {
        emitEventTransition(prisma, io, {
          type: "WATER",
          severity: "HIGH",
          description: `Water level elevated at ${sensor.zoneName} (${waterLevelCm} cm)`,
          assetId: sensor.id,
          zoneId: sensor.zoneId,
          metadata: { lat: sensor.lat, lng: sensor.lng }
        });
      } else {
        emitEventTransition(prisma, io, {
          type: "WATER",
          severity: "NORMAL",
          description: `Water level at ${sensor.zoneName} normalized (${waterLevelCm} cm)`,
          assetId: sensor.id,
          zoneId: sensor.zoneId,
          metadata: { lat: sensor.lat, lng: sensor.lng }
        });
      }
    }),
  );

  // Batch insert historical readings
  if (waterReadings.length > 0) {
    await prisma.waterReading.createMany({ data: waterReadings });
  }

  return { traffic: trafficPayloads, water: waterPayloads };
}

/** 10% chance every 2 minutes: auto-create an accident/fire/flood incident. */
export async function maybeCreateIncident(
  junctions: JunctionProfile[],
  sensors: WaterSensorProfile[],
): Promise<IncidentPayload | null> {
  const chance = isDemoMode ? DEMO_INCIDENT_CHANCE : INCIDENT_CHANCE;
  if (Math.random() >= chance || junctions.length === 0) return null;

  const roll = Math.random();
  const type = roll < 0.5 ? "traffic" : roll < 0.75 ? "fire" : "flood";
  const origin =
    type === "flood"
      ? sensors[Math.floor(Math.random() * sensors.length)]
      : junctions[Math.floor(Math.random() * junctions.length)];

  const incident = await prisma.incident.create({
    data: {
      type,
      lat: origin.lat,
      lng: origin.lng,
      severity: 2 + Math.floor(Math.random() * 4), // 2–5
      source: "sensor",
    },
  });

  return {
    id: incident.id,
    type: incident.type,
    severity: incident.severity,
    lat: incident.lat,
    lng: incident.lng,
    source: incident.source,
    status: incident.status,
    reportedAt: incident.reportedAt.toISOString(),
  };
}

async function main() {
  const [zones, junctionRows, sensorRows] = await Promise.all([
    prisma.zone.findMany({ select: { id: true, name: true } }),
    prisma.junction.findMany({
      select: { id: true, name: true, zoneId: true, lat: true, lng: true },
    }),
    prisma.waterSensor.findMany({ select: { id: true, zoneId: true, lat: true, lng: true, waterLevel: true } }),
  ]);

  const zoneNames = new Map(zones.map((z) => [z.id, z.name]));

  const junctions: JunctionProfile[] = junctionRows.map((j) => ({
    ...j,
    capacity: 8_000 + Math.random() * 4_000,
    peakWeight: 0.7 + Math.random() * 0.45,
  }));

  const sensors: WaterSensorProfile[] = sensorRows.map((s) => ({
    id: s.id,
    zoneId: s.zoneId,
    zoneName: zoneNames.get(s.zoneId) ?? "Unknown",
    lat: s.lat,
    lng: s.lng,
    baseline: s.waterLevel,
    level: s.waterLevel,
  }));

  const pubClient = createRedisClient();
  const subClient = pubClient.duplicate();

  const io = new Server<ClientToServerEvents, ServerToClientEvents>(4001, {
    cors: { origin: "*" },
    adapter: createAdapter(pubClient, subClient),
  });

  const scenarioEngine = new ScenarioEngine(prisma, io as any);

  io.on("connection", (socket) => {
    console.log(`[worker] client connected (${io.engine.clientsCount} online)`);

    socket.on(SOCKET_EVENTS.settingsUpdate, async (payload, ack) => {
      const monsoonEnabled = Boolean(payload?.monsoonEnabled);
      const demoModeEnabled = Boolean(payload?.demoModeEnabled);
      await prisma.simulationSetting.upsert({
        where: { key: "global" },
        update: { monsoonEnabled, demoModeEnabled },
        create: { key: "global", monsoonEnabled, demoModeEnabled },
      });
      console.log(`[worker] monsoon simulation ${monsoonEnabled ? "ENABLED" : "disabled"} | demo mode ${demoModeEnabled ? "ENABLED" : "disabled"}`);
      ack?.({ monsoonEnabled, demoModeEnabled });
    });

    socket.on(SOCKET_EVENTS.scenarioCommand as any, (payload: any, ack: any) => {
      scenarioEngine.setCommand(payload);
      if (payload.action === "start") {
        console.log(`[worker] Received simulation command: start ${payload.scenarioId} at ${payload.severity} severity`);
      } else {
        console.log(`[worker] Received simulation command: ${payload.action}`);
      }
      ack?.({ success: true });
    });

    socket.on("disconnect", () => {
      console.log(`[worker] client disconnected (${io.engine.clientsCount} online)`);
    });
  });

  const runTick = async () => {
    const settings = await prisma.simulationSetting.findUnique({
      where: { key: "global" },
    });
    
    const wasDemoMode = isDemoMode;
    isDemoMode = settings?.demoModeEnabled ?? false;
    
    if (isDemoMode && !wasDemoMode) {
      demoHour = 8; // Reset to 8 AM when entering demo mode
      console.log("[worker] Entered DEMO MODE (Accelerated)");
      resetTimers(); // Switch to fast timers
    } else if (!isDemoMode && wasDemoMode) {
      console.log("[worker] Exited DEMO MODE (Normal)");
      resetTimers(); // Switch back to normal timers
    }

    const now = new Date();
    let hour = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
    
    if (isDemoMode) {
      demoHour = (demoHour + DEMO_HOUR_INCREMENT) % 24;
      hour = demoHour;
    }

    try {
      // Execute causal scenario tick
      await scenarioEngine.runCausalTick(currentTickMs);
      const causalMods = scenarioEngine.getModifiers();

      const { traffic, water } = await tick(junctions, sensors, hour, causalMods, io as any);
      for (const payload of traffic) io.emit(SOCKET_EVENTS.trafficUpdate, payload);
      for (const payload of water) io.emit(SOCKET_EVENTS.waterUpdate, payload);
      if (settings) await runAdvancedCorrelations(prisma, io, settings, zones);
      // STAR ADD-ON #1 — runs every ~60s inside the existing tick loop
      await runAssetSimulation(prisma);
      // --- STAR ADD-ON #2: Additive Telemetry & City Health ---
      try {
        const simSettings = settings || { 
          scenarioMode: "normal", 
          simSpeedMultiplier: 1, 
          monsoonEnabled: false 
        };

        const ctx: TelemetryContext = {
          prisma,
          io: io as any,
          simulatedHour: hour,
          speedMultiplier: simSettings.simSpeedMultiplier,
          isMonsoon: simSettings.monsoonEnabled,
          scenario: simSettings.scenarioMode,
          causalMods,
        };

        const [envRes, wasteRes, energyRes] = await Promise.all([
          environmentGenerator.runTick(ctx),
          wasteGenerator.runTick(ctx),
          energyGenerator.runTick(ctx)
        ]);

        const allReadings = [...envRes.readings, ...wasteRes.readings, ...energyRes.readings];
        if (allReadings.length > 0) {
          io.emit(SOCKET_EVENTS.telemetryUpdate, allReadings);
        }

        // City Health Aggregation
        // Combine old explicit traffic/water health proxies and new scores
        const trafficHealth = 100 - (traffic.reduce((acc, t) => acc + t.congestionLevel, 0) / (traffic.length || 1)) * 100;
        const waterHealth = water.some(w => w.riskLevel === "danger" || w.riskLevel === "warning") ? 50 : 100;
        
        const envScore = envRes.healthScore ?? 100;
        const wasteScore = wasteRes.healthScore ?? 100;
        const energyScore = energyRes.healthScore ?? 100;

        const overallScore = Math.round(
          (trafficHealth * 0.3) + 
          (waterHealth * 0.2) + 
          (envScore * 0.2) + 
          (wasteScore * 0.15) + 
          (energyScore * 0.15)
        );

        const healthPayload: CityHealthPayload = {
          overallScore: Math.max(0, Math.min(100, overallScore)),
          components: {
            traffic: Math.round(trafficHealth),
            water: Math.round(waterHealth),
            environment: envScore,
            waste: wasteScore,
            energy: energyScore,
            cctv: 100, // Placeholder for future add-on
            emergency: 100 // Placeholder for future add-on
          },
          timestamp: new Date().toISOString()
        };

        io.emit(SOCKET_EVENTS.cityHealthUpdate, healthPayload);

      } catch (err) {
        console.error("[worker] additive telemetry phase failed (isolated):", err);
      }

      // --------------------------------------------------------

    } catch (err) {
      console.error("[worker] tick failed:", err);
    }
  };

  let tickCount = 0;
  const runTickAndCount = async () => {
    await runTick();
    tickCount += 1;
  };

  let incidentTimer: NodeJS.Timeout;
  const runIncidentRoll = async () => {
    try {
      const incident = await maybeCreateIncident(junctions, sensors);
      if (incident) {
        io.emit(SOCKET_EVENTS.incidentNew, incident);
        console.log(
          `[worker] auto incident (${incident.type}, severity ${incident.severity}) at ${incident.lat.toFixed(4)}, ${incident.lng.toFixed(4)}`,
        );
      }
    } catch (err) {
      console.error("[worker] incident roll failed:", err);
    }
  };

  const heartbeat = setInterval(() => {
    console.log(
      `[worker] heartbeat ${new Date().toISOString()} | ticks=${tickCount} | junctions=${junctions.length} | waterSensors=${sensors.length} | clients=${io.engine.clientsCount} | demoMode=${isDemoMode}`,
    );
  }, HEARTBEAT_MS);

  let tickTimer: NodeJS.Timeout;

  const resetTimers = () => {
    if (tickTimer) clearInterval(tickTimer);
    if (incidentTimer) clearInterval(incidentTimer);

    currentTickMs = isDemoMode ? DEMO_TICK_MS : DEFAULT_TICK_MS;
    const currentIncidentMs = isDemoMode ? DEMO_INCIDENT_INTERVAL_MS : INCIDENT_INTERVAL_MS;

    tickTimer = setInterval(runTickAndCount, currentTickMs);
    incidentTimer = setInterval(runIncidentRoll, currentIncidentMs);
  };

  console.log(
    `[worker] Smart Chennai sensor simulator started on ws://localhost:4001 | ` +
      `${junctions.length} junctions, ${sensors.length} water sensors`,
  );

  await runTickAndCount();
  resetTimers();

  const shutdown = async () => {
    clearInterval(tickTimer);
    clearInterval(incidentTimer);
    clearInterval(heartbeat);
    io.close();
    pubClient.disconnect();
    subClient.disconnect();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

if (require.main === module) {
  main().catch((err) => {
    console.error("[worker] fatal:", err);
    process.exit(1);
  });
}
