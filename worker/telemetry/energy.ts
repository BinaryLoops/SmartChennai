import { TelemetryContext, TelemetryGenerator } from "./types";
import { TelemetryReading } from "../../packages/types";
import { emitEventTransition } from "../event_fabric";

export const energyGenerator: TelemetryGenerator = {
  name: "energy",
  runTick: async (ctx: TelemetryContext) => {
    const { prisma, io, simulatedHour, speedMultiplier, scenario } = ctx;
    const readings: TelemetryReading[] = [];
    const shouldSample = Math.random() < 0.1;

    try {
      // 1. Process EnergyAssets (Substations and Transformers)
      const energyAssets = await prisma.energyAsset.findMany({
        include: {
          streetlights: true,
          dependentAssets: true
        }
      });
      
      let totalFaults = 0;
      let totalOverloads = 0;
      let gridAvailabilityByZone: Record<string, number> = {};

      for (const asset of energyAssets) {
        let { currentLoad, status, powerState } = asset;
        
        // Calculate Base Demand for this tick
        let baseDemand = 40; // Base 40%
        
        // Evening peak (residential + streetlights)
        if (simulatedHour >= 18 && simulatedHour <= 22) baseDemand += 30;
        // Night (streetlights only)
        else if (simulatedHour > 22 || simulatedHour <= 6) baseDemand += 20;
        // Day peak (commercial)
        else if (simulatedHour >= 9 && simulatedHour <= 17) baseDemand += 25;

        // Causal modifiers
        if (scenario === "EXTREME_HEAT") {
          baseDemand += 25; // High cooling demand
        }

        // Noise and stateful transition
        let targetLoad = baseDemand + (Math.random() * 10 - 5); 
        
        if (status === "FAULT" || status === "OFFLINE" || status === "RECOVERING") {
          targetLoad = 0; // No load while broken or recovering
        }

        // Gradual shift towards target
        if (currentLoad < targetLoad) {
          currentLoad = Math.min(100, currentLoad + (Math.random() * 2 * speedMultiplier));
        } else {
          currentLoad = Math.max(0, currentLoad - (Math.random() * 2 * speedMultiplier));
        }

        // State machine
        let nextStatus = status;
        let nextPowerState = powerState;

        if (status === "FAULT" || status === "OFFLINE") {
          totalFaults++;
          // Chance to begin recovery
          if (Math.random() < 0.05 * speedMultiplier) {
            nextStatus = "RECOVERING";
          }
        } else if (status === "RECOVERING") {
          if (Math.random() < 0.1 * speedMultiplier) {
            nextStatus = "NORMAL";
            nextPowerState = "ON";
            
            // Emit recovery event
            await emitEventTransition(prisma, io, {
              type: "ENERGY",
              severity: "NORMAL",
              description: `${asset.type} ${asset.id} recovered and power restored.`,
              zoneId: asset.zoneId,
              source: "sensor",
              confidence: 0.95
            });
          }
        } else {
          // Normal operating states based on load
          if (currentLoad > 99) {
            if (Math.random() < 0.2 * speedMultiplier) {
              nextStatus = "FAULT";
              nextPowerState = "OFF";
              
              const affectedCount = asset.streetlights.length + asset.dependentAssets.length;
              await emitEventTransition(prisma, io, {
                type: "ENERGY",
                severity: "CRITICAL",
                description: `POWER OUTAGE: ${asset.type} ${asset.id} failed due to extreme overload. Affected: ${asset.streetlights.length} streetlights, ${asset.dependentAssets.length} dependent assets.`,
                zoneId: asset.zoneId,
                source: "sensor",
                confidence: 0.99
              });
            } else {
              nextStatus = "OVERLOAD_RISK";
            }
          } else if (currentLoad > 90) {
            nextStatus = "OVERLOAD_RISK";
          } else if (currentLoad > 80) {
            nextStatus = "HIGH_LOAD";
          } else if (currentLoad > 60) {
            nextStatus = "LOADED";
          } else {
            nextStatus = "NORMAL";
          }

          // Emit warning if newly entering OVERLOAD_RISK
          if (nextStatus === "OVERLOAD_RISK" && status !== "OVERLOAD_RISK") {
            await emitEventTransition(prisma, io, {
              type: "ENERGY",
              severity: "HIGH",
              description: `${asset.type} ${asset.id} is at OVERLOAD RISK (${Math.round(currentLoad)}% load).`,
              zoneId: asset.zoneId,
              source: "sensor",
              confidence: 0.90
            });
          }
        }

        if (nextStatus === "OVERLOAD_RISK") totalOverloads++;

        await prisma.energyAsset.update({
          where: { id: asset.id },
          data: {
            currentLoad,
            status: nextStatus,
            powerState: nextPowerState,
            updatedAt: new Date()
          }
        });

        // Store availability per zone for cross-domain usage
        if (asset.type === "TRANSFORMER") {
           if (!gridAvailabilityByZone[asset.zoneId]) gridAvailabilityByZone[asset.zoneId] = 0;
           gridAvailabilityByZone[asset.zoneId] += (nextPowerState === "ON" ? 1 : 0);
        }

        // Sampling
        if (shouldSample) {
          const cityAsset = await prisma.cityAsset.findFirst({ where: { refId: asset.id, refType: "EnergyAsset" }});
          if (cityAsset) {
            await prisma.telemetrySample.create({
              data: { assetId: cityAsset.id, metric: "currentLoad", value: currentLoad, unit: "%" }
            });
          }
        }
      }

      // Convert grid counts to percentages for the context
      for (const zId of Object.keys(gridAvailabilityByZone)) {
         const total = energyAssets.filter(a => a.zoneId === zId && a.type === "TRANSFORMER").length;
         if (total > 0) {
           gridAvailabilityByZone[zId] = gridAvailabilityByZone[zId] / total;
         }
      }

      // Apply to causal context
      ctx.causalMods = ctx.causalMods || {};
      // Aggregate a global average for generic usage, though specific zones have specific availability
      let globalAvail = 1.0;
      const zoneIds = Object.keys(gridAvailabilityByZone);
      if (zoneIds.length > 0) {
        globalAvail = zoneIds.reduce((sum, z) => sum + gridAvailabilityByZone[z], 0) / zoneIds.length;
      }
      ctx.causalMods.powerGridAvailability = globalAvail;


      // 2. Process StreetLights
      const lights = await prisma.streetLight.findMany({ include: { EnergyAsset: true } });
      let lightFaults = 0;

      let expectedDimming = 0;
      if (simulatedHour >= 18.5 || simulatedHour <= 5.5) {
        expectedDimming = 100;
      } else if (simulatedHour > 17.5 && simulatedHour < 18.5) {
        expectedDimming = Math.round((simulatedHour - 17.5) * 100);
      } else if (simulatedHour > 5.5 && simulatedHour < 6.5) {
        expectedDimming = Math.round((6.5 - simulatedHour) * 100);
      }

      for (const light of lights) {
        let status = light.status;
        
        // If upstream transformer is OFF, streetlight is unpowered
        const isPowered = light.EnergyAsset ? light.EnergyAsset.powerState === "ON" : true;

        if (!isPowered) {
          status = "offline";
        } else {
          // Normal operations
          if (status === "offline") status = "online"; // Recovered power
          
          let faultChance = 0.001 * speedMultiplier;
          if (status !== "fault" && Math.random() < faultChance) {
            status = "fault";
          }
          if (status === "fault" && Math.random() < 0.05 * speedMultiplier) {
            status = "online";
          }
        }

        const dimmingLevel = (status === "fault" || status === "offline") ? 0 : expectedDimming;
        const powerConsumption = dimmingLevel > 0 ? (dimmingLevel / 100) * 150 : 0; 

        await prisma.streetLight.update({
          where: { id: light.id },
          data: { status, powerConsumption, dimmingLevel, updatedAt: new Date() }
        });

        if (status === "fault" || status === "offline") lightFaults++;

        if (shouldSample) {
          const asset = await prisma.cityAsset.findFirst({ where: { refId: light.id, refType: "StreetLight" }});
          if (asset) {
            await prisma.telemetrySample.create({
              data: { assetId: asset.id, metric: "powerConsumption", value: powerConsumption, unit: "W" }
            });
          }
        }
      }

      const totalEnergyAssets = energyAssets.length;
      const healthScore = totalEnergyAssets > 0 ? 100 - (totalFaults / totalEnergyAssets) * 100 - (totalOverloads / totalEnergyAssets) * 50 : 100;

      return { readings, healthScore: Math.max(0, Math.round(healthScore)) };
    } catch (err) {
      console.error("[telemetry:energy] generator failed:", err);
      return { readings: [], healthScore: null };
    }
  }
};
