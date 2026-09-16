import { PrismaClient, SimulationSetting, Zone, Junction, WaterSensor, EnvironmentSensor, GarbageBin, StreetLight, PublicVehicle } from "@prisma/client";
import { Server } from "socket.io";

// In-memory cache for event deduplication and cooldowns.
// Key: "event_type:zoneId:severity" -> Value: timestamp of last emission
const eventCooldowns = new Map<string, number>();
const COOLDOWN_MS = 60 * 1000 * 5; // 5 minutes cooldown per event type/location

/**
 * Ensures we don't spam the database with duplicate events.
 */
async function emitAndPersistEvent(
  prisma: PrismaClient,
  io: Server<any, any, any, any>,
  type: string,
  severity: string,
  description: string,
  zoneId?: string | null,
  source: string = "system"
) {
  const cacheKey = `${type}:${zoneId || "global"}:${severity}`;
  const now = Date.now();
  const lastTime = eventCooldowns.get(cacheKey) || 0;

  if (now - lastTime < COOLDOWN_MS) {
    return; // Blocked by cooldown
  }

  eventCooldowns.set(cacheKey, now);

  const cityEvent = await prisma.cityEvent.create({
    data: {
      type,
      severity,
      description,
      zoneId: zoneId || null,
      source,
      status: "active",
      timestamp: new Date()
    }
  });

  io.emit("cityEvent:new", cityEvent);
}

/**
 * A safe, decoupled correlative physics engine.
 * Run at the end of the main simulate tick.
 */
export async function runAdvancedCorrelations(
  prisma: PrismaClient,
  io: Server<any, any, any, any>,
  settings: SimulationSetting,
  zones: { id: string; name: string }[]
) {
  try {
    const envSensors = await prisma.environmentSensor.findMany();
    const bins = await prisma.garbageBin.findMany();
    const lights = await prisma.streetLight.findMany();

    const scenario = settings.scenarioMode || "normal";
    const speed = settings.simSpeedMultiplier || 1;

    // Apply Scenario effects
    for (const env of envSensors) {
      let aqiShift = (Math.random() * 4 - 2) * speed;
      let tempShift = (Math.random() * 2 - 1) * speed;

      if (scenario === "Heavy Rain") {
        aqiShift -= 2 * speed;
        tempShift -= 1 * speed;
      } else if (scenario === "Traffic Surge") {
        aqiShift += 3 * speed;
      }

      const newAqi = Math.max(10, Math.min(500, env.aqi + aqiShift));
      const newTemp = Math.max(20, Math.min(45, env.temperature + tempShift));

      await prisma.environmentSensor.update({
        where: { id: env.id },
        data: { aqi: Math.round(newAqi), temperature: newTemp }
      });

      if (newAqi > 150) {
        await emitAndPersistEvent(prisma, io, "ENVIRONMENT", "HIGH", "AQI reached unhealthy levels", null);
      }
    }

    // Waste Management Simulation
    for (const bin of bins) {
      let fillIncrease = (Math.random() * 2) * speed;
      if (scenario === "Crowd Surge") {
        fillIncrease *= 3;
      }
      const newFill = Math.min(100, bin.fillPercentage + fillIncrease);
      const status = newFill > 95 ? "overflowing" : "ok";

      await prisma.garbageBin.update({
        where: { id: bin.id },
        data: { fillPercentage: Math.round(newFill), status }
      });

      if (status === "overflowing") {
        await emitAndPersistEvent(prisma, io, "WASTE", "MEDIUM", "Garbage bin overflowing", bin.zoneId);
      }
    }

    // Street Lights Simulation
    for (const light of lights) {
      if (Math.random() < 0.005 * speed) {
        await prisma.streetLight.update({
          where: { id: light.id },
          data: { status: "fault" }
        });
        await emitAndPersistEvent(prisma, io, "STREETLIGHT", "LOW", "Streetlight fault detected", light.zoneId);
      }
    }

    io.emit("environment:update", { timestamp: new Date().toISOString() });
    io.emit("waste:update", { timestamp: new Date().toISOString() });
    
  } catch (error) {
    console.error("[worker:extended] Failed to run advanced correlations:", error);
  }
}
