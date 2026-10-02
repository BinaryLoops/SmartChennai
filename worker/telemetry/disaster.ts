import { PrismaClient } from "@prisma/client";
import { TelemetryContext, TelemetryGenerator } from "./types";
import { TelemetryReading } from "../../packages/types";

export const disasterGenerator: TelemetryGenerator = {
  name: "disaster",
  runTick: async (ctx: TelemetryContext) => {
    const { prisma, io, speedMultiplier, scenario, causalMods } = ctx;
    const readings: TelemetryReading[] = [];
    let healthScore = 100;

  // 1. Generate ambient incidents based on causal modifiers
  const demandMultiplier = causalMods?.emergencyDemandMultiplier || 0;
  const floodRisk = causalMods?.floodRiskMultiplier || 0;

  if (demandMultiplier > 0.1 && Math.random() < (0.05 * demandMultiplier)) {
    // Spawn a medical incident in a random zone
    const zones = await prisma.zone.findMany();
    if (zones.length > 0) {
      const z = zones[Math.floor(Math.random() * zones.length)];
      const lat = (z as any).centerLat + (Math.random() - 0.5) * 0.02;
      const lng = (z as any).centerLng + (Math.random() - 0.5) * 0.02;
      
      const referenceId = `INC-${Date.now()}-MED`;
      await prisma.incident.create({
        data: {
          type: "medical",
          severity: Math.random() > 0.8 ? 5 : 3,
          source: "sensor",
          lat,
          lng,
          description: "Simulated causal medical emergency",
          referenceId,
          priorityScore: 8.0,
          status: "reported"
        }
      });
    }
  }

  if (floodRisk > 0.5 && Math.random() < (0.05 * floodRisk)) {
    // Spawn a flood incident
    const zones = await prisma.zone.findMany();
    if (zones.length > 0) {
      const z = zones[Math.floor(Math.random() * zones.length)];
      const lat = (z as any).centerLat + (Math.random() - 0.5) * 0.02;
      const lng = (z as any).centerLng + (Math.random() - 0.5) * 0.02;
      
      const referenceId = `INC-${Date.now()}-FLD`;
      await prisma.incident.create({
        data: {
          type: "flood",
          severity: Math.random() > 0.8 ? 5 : 4,
          source: "sensor",
          lat,
          lng,
          description: "Simulated causal flood detected",
          referenceId,
          priorityScore: 7.0,
          status: "reported"
        }
      });
    }
  }

  // Calculate disaster healthScore (e.g. penalized by high floodRisk)
  if (floodRisk > 1.0) healthScore -= 30;
  if (demandMultiplier > 0.5) healthScore -= 20;

  return { readings, healthScore: Math.max(0, healthScore) };
  }
};
