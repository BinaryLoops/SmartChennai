import { TelemetryContext, TelemetryGenerator } from "./types";
import { TelemetryReading } from "../../packages/types";
import { emitEventTransition } from "../event_fabric";
import { AssetStatus } from "@prisma/client";

// In-memory state to track sensor failures and prevent flickering
interface SensorState {
  status: AssetStatus;
  ticksLeft: number;
}
const sensorStateMap = new Map<string, SensorState>();

function calculateSubIndex(val: number, breakpoints: number[], aqiPoints: number[]) {
  for (let i = 0; i < breakpoints.length - 1; i++) {
    if (val >= breakpoints[i] && val <= breakpoints[i + 1]) {
      return Math.round(
        ((aqiPoints[i + 1] - aqiPoints[i]) / (breakpoints[i + 1] - breakpoints[i])) * (val - breakpoints[i]) + aqiPoints[i]
      );
    }
  }
  return aqiPoints[aqiPoints.length - 1]; // max out
}

function calculateAQI(pm25: number, pm10: number, no2: number, co: number): number {
  const pm25Sub = calculateSubIndex(pm25, [0, 30, 60, 90, 120, 250], [0, 50, 100, 200, 300, 400]);
  const pm10Sub = calculateSubIndex(pm10, [0, 50, 100, 250, 350, 430], [0, 50, 100, 200, 300, 400]);
  const no2Sub = calculateSubIndex(no2, [0, 40, 80, 180, 280, 400], [0, 50, 100, 200, 300, 400]);
  const coSub = calculateSubIndex(co, [0, 1, 2, 10, 17, 34], [0, 50, 100, 200, 300, 400]);
  return Math.max(pm25Sub, pm10Sub, no2Sub, coSub);
}

export const environmentGenerator: TelemetryGenerator = {
  name: "environment",
  runTick: async (ctx: TelemetryContext) => {
    const { prisma, io, simulatedHour, speedMultiplier, isMonsoon } = ctx;
    const readings: TelemetryReading[] = [];
    const shouldSample = Math.random() < 0.1; // 10% chance to persist to DB

    try {
      const cityAssets = await prisma.cityAsset.findMany({
        where: { category: "ENVIRONMENT", refType: "EnvironmentSensor" },
      });
      
      const envSensors = await prisma.environmentSensor.findMany();
      const envSensorMap = new Map(envSensors.map(s => [s.id, s]));

      let totalAqi = 0;
      let onlineCount = 0;

      for (const asset of cityAssets) {
        if (!asset.refId) continue;
        const env = envSensorMap.get(asset.refId);
        if (!env) continue;

        // Failure Model
        let state = sensorStateMap.get(asset.id);
        if (!state) {
          state = { status: asset.status, ticksLeft: 0 };
          sensorStateMap.set(asset.id, state);
        }

        if (state.ticksLeft > 0) {
          state.ticksLeft--;
        } else {
          // Transition state logic
          if (state.status === "OFFLINE" || state.status === "DEGRADED") {
            state.status = "HEALTHY";
            state.ticksLeft = 20 + Math.floor(Math.random() * 40); // Stay healthy for a while
          } else {
            // Low probability to fail
            const roll = Math.random();
            if (roll < 0.001 * speedMultiplier) {
              state.status = "OFFLINE";
              state.ticksLeft = 10 + Math.floor(Math.random() * 20);
            } else if (roll < 0.005 * speedMultiplier) {
              state.status = "DEGRADED";
              state.ticksLeft = 5 + Math.floor(Math.random() * 15);
            }
          }
        }

        if (state.status !== asset.status) {
          await prisma.cityAsset.update({
            where: { id: asset.id },
            data: { status: state.status }
          });
          
          if (state.status === "OFFLINE") {
            await emitEventTransition(prisma, io, {
              type: "ENVIRONMENT",
              severity: "MEDIUM",
              description: `Sensor ${asset.name} went OFFLINE.`,
              zoneId: asset.zoneId || undefined,
              source: "system",
              confidence: 1.0,
              assetId: asset.id
            });
          } else if (state.status === "HEALTHY") {
            await emitEventTransition(prisma, io, {
              type: "ENVIRONMENT",
              severity: "INFO",
              description: `Sensor ${asset.name} RECOVERED and is ONLINE.`,
              zoneId: asset.zoneId || undefined,
              source: "system",
              confidence: 1.0,
              assetId: asset.id
            });
          }
        }

        // If offline, halt fresh telemetry
        if (state.status === "OFFLINE") {
          continue; 
        }

        onlineCount++;

        // Base variations
        let pm25Shift = (Math.random() * 2 - 1) * speedMultiplier;
        let tempShift = (Math.random() * 1 - 0.5) * speedMultiplier;
        let rainShift = 0;
        let windShift = (Math.random() * 2 - 1);
        let noiseShift = (Math.random() * 4 - 2);

        // Day/Night cycles
        const diurnalTemp = 28 + 5 * Math.sin(((simulatedHour - 8) / 24) * 2 * Math.PI);
        let targetTemp = diurnalTemp + (isMonsoon ? -3 : 0);
        let targetRain = isMonsoon ? 10 : 0;

        // Causal Modifiers from STAR #3
        if (ctx.causalMods) {
          if (ctx.causalMods.pm25Multiplier) pm25Shift += env.pm25 * ctx.causalMods.pm25Multiplier;
          if (ctx.causalMods.temperatureShift) tempShift += ctx.causalMods.temperatureShift;
          if (ctx.causalMods.rainfallMultiplier) targetRain += (10 * ctx.causalMods.rainfallMultiplier);
          if (ctx.causalMods.noiseMultiplier) noiseShift += (50 * ctx.causalMods.noiseMultiplier);
        }

        const newTemp = Math.max(15, Math.min(50, env.temperature + (targetTemp - env.temperature) * 0.1 + tempShift));
        const newRain = Math.max(0, env.rainfall + (targetRain - env.rainfall) * 0.2 + (targetRain > 0 ? rainShift : 0));
        const newPm25 = Math.max(5, env.pm25 + pm25Shift);
        const newPm10 = newPm25 * 1.8 + Math.random() * 5;
        const newNo2 = Math.max(5, env.no2 + (pm25Shift * 0.5)); // Correlated with PM2.5
        const newCo = Math.max(0.1, env.co + (pm25Shift * 0.02));
        const newWind = Math.max(0, env.windSpeed + windShift);
        const newNoise = Math.max(30, Math.min(100, env.noise + noiseShift));
        const newUv = simulatedHour > 7 && simulatedHour < 18 ? Math.max(0, 5 + 4 * Math.sin(((simulatedHour - 7) / 11) * Math.PI)) : 0;

        const newAqi = calculateAQI(newPm25, newPm10, newNo2, newCo);

        // Update Hot State
        await prisma.environmentSensor.update({
          where: { id: env.id },
          data: { 
            aqi: newAqi, 
            temperature: newTemp, 
            rainfall: newRain,
            pm25: newPm25,
            pm10: newPm10,
            no2: newNo2,
            co: newCo,
            windSpeed: newWind,
            noise: newNoise,
            uv: newUv,
            updatedAt: new Date() 
          }
        });

        const timestamp = new Date().toISOString();
        const baseReading = {
          assetId: asset.id,
          timestamp,
          quality: (state.status === "DEGRADED" ? "STALE" : "LIVE") as "STALE" | "LIVE",
          source: "sensor",
        };

        readings.push(
          { id: `env-aqi-${asset.id}-${Date.now()}`, metric: "aqi", value: newAqi, unit: "AQI", ...baseReading },
          { id: `env-tmp-${asset.id}-${Date.now()}`, metric: "temperature", value: Math.round(newTemp * 10) / 10, unit: "C", ...baseReading },
          { id: `env-rn-${asset.id}-${Date.now()}`, metric: "rainfall", value: Math.round(newRain * 10) / 10, unit: "mm/h", ...baseReading },
        );

        // Event Fabric Thresholds
        if (newAqi > 200 && env.aqi <= 200) {
          await emitEventTransition(prisma, io, {
            type: "ENVIRONMENT",
            severity: "HIGH",
            description: `HAZARDOUS AIR QUALITY (${Math.round(newAqi)} AQI) detected at ${asset.name}.`,
            zoneId: asset.zoneId || undefined,
            source: "sensor",
            confidence: 0.98,
            assetId: asset.id
          });
        } else if (newAqi > 100 && env.aqi <= 100) {
          await emitEventTransition(prisma, io, {
            type: "ENVIRONMENT",
            severity: "MEDIUM",
            description: `POOR AIR QUALITY (${Math.round(newAqi)} AQI) detected at ${asset.name}.`,
            zoneId: asset.zoneId || undefined,
            source: "sensor",
            confidence: 0.95,
            assetId: asset.id
          });
        } else if (newAqi < 100 && env.aqi >= 100) {
           await emitEventTransition(prisma, io, {
            type: "ENVIRONMENT",
            severity: "NORMAL",
            description: `Air quality recovered to NORMAL (${Math.round(newAqi)} AQI) at ${asset.name}.`,
            zoneId: asset.zoneId || undefined,
            source: "sensor",
            confidence: 0.95,
            assetId: asset.id
          });
        }

        if (newTemp > 42 && env.temperature <= 42) {
          await emitEventTransition(prisma, io, {
            type: "ENVIRONMENT",
            severity: "HIGH",
            description: `EXTREME HEAT WARNING (${Math.round(newTemp)}°C) at ${asset.name}.`,
            zoneId: asset.zoneId || undefined,
            source: "sensor",
            confidence: 0.99,
            assetId: asset.id
          });
        }

        if (newRain > 25 && env.rainfall <= 25) {
          await emitEventTransition(prisma, io, {
            type: "ENVIRONMENT",
            severity: "CRITICAL",
            description: `HEAVY RAINFALL (${Math.round(newRain)}mm/h) detected at ${asset.name}.`,
            zoneId: asset.zoneId || undefined,
            source: "sensor",
            confidence: 0.99,
            assetId: asset.id
          });
        }

        totalAqi += newAqi;

        if (shouldSample) {
          await prisma.telemetrySample.createMany({
            data: [
              { assetId: asset.id, metric: "aqi", value: newAqi, unit: "AQI" },
              { assetId: asset.id, metric: "temperature", value: Math.round(newTemp * 10) / 10, unit: "C" },
              { assetId: asset.id, metric: "rainfall", value: Math.round(newRain * 10) / 10, unit: "mm/h" },
              { assetId: asset.id, metric: "pm25", value: Math.round(newPm25 * 10) / 10, unit: "µg/m³" },
              { assetId: asset.id, metric: "noise", value: Math.round(newNoise), unit: "dB" }
            ]
          });
        }
      }

      const avgAqi = onlineCount > 0 ? totalAqi / onlineCount : 50;
      let healthScore = 100 - (Math.max(0, avgAqi - 50) / 250) * 100;
      healthScore = Math.max(0, Math.min(100, healthScore));

      return { readings, healthScore: Math.round(healthScore) };
    } catch (err) {
      console.error("[telemetry:environment] generator failed:", err);
      return { readings: [], healthScore: null };
    }
  }
};
