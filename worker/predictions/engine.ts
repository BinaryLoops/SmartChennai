import { PrismaClient } from "@prisma/client";
import { Server } from "socket.io";
import { PredictionContext, PredictionResult } from "./types";
import { SOCKET_EVENTS } from "../../packages/types";
import { emitEventTransition } from "../event_fabric";
import { SCENARIO_DEFINITIONS, BASELINE_MODIFIERS } from "../scenarios/definitions";

// Import predictors
import { trafficPredictor } from "./traffic";
import { floodPredictor } from "./flood";
import { environmentPredictor } from "./environment";
import { wastePredictor } from "./waste";
import { energyPredictor } from "./energy";
import { transitPredictor } from "./transit";
import { emergencyPredictor } from "./emergency";
import { citizenServicesPredictor } from "./citizenServices";
import { infrastructurePredictor } from "./infrastructure";

const PREDICTORS = [
  trafficPredictor,
  floodPredictor,
  environmentPredictor,
  wastePredictor,
  energyPredictor,
  transitPredictor,
  emergencyPredictor,
  citizenServicesPredictor,
  infrastructurePredictor,
];

// Run every 5 minutes internally (but actual schedule is controlled by simulate.ts passing elapsed time)
export const PREDICTION_INTERVAL_MS = 5 * 60 * 1000; 

export class PredictionEngine {
  private prisma: PrismaClient;
  private io: Server;
  private lastRunTime: number = 0;

  constructor(prisma: PrismaClient, io: Server) {
    this.prisma = prisma;
    this.io = io;
  }

  public async checkAndRun(now: number, scenarioId: string, modifiers: any) {
    if (now - this.lastRunTime >= PREDICTION_INTERVAL_MS) {
      this.lastRunTime = now;
      await this.runPredictionCycle(scenarioId, modifiers);
    }
  }

  private async runPredictionCycle(scenarioId: string, modifiers: any) {
    try {
      console.log("[PredictionEngine] Starting prediction cycle...");
      
      const ctx = await this.buildContext(scenarioId, modifiers);
      const snapshots: PredictionResult[] = [];

      for (const predictor of PREDICTORS) {
        try {
          const req = { domain: predictor.name.toLowerCase().replace('predictor', ''), horizonMinutes: [15, 30, 60] };
          const results = await predictor.predict(req, ctx);
          snapshots.push(...results);
        } catch (err) {
          console.error(`[PredictionEngine] Predictor ${predictor.name} failed:`, err);
        }
      }

      await this.saveSnapshots(snapshots, ctx.generatedAt, scenarioId);
      await this.emitAlertsAndUpdates(snapshots);
      await this.cleanupOldSnapshots();
      
      console.log(`[PredictionEngine] Cycle complete. Generated ${snapshots.length} predictions.`);
    } catch (err) {
      console.error("[PredictionEngine] Cycle failed:", err);
    }
  }

  private async buildContext(scenarioId: string, modifiers: any): Promise<PredictionContext> {
    const generatedAt = new Date();
    // Bounded queries for hot state (last 30 readings or active items)
    const [
      trafficReadings,
      waterSensors,
      telemetry,
      activeIncidents,
      serviceRequests,
      workOrders,
    ] = await Promise.all([
      this.prisma.trafficReading.findMany({
        take: 300,
        orderBy: { timestamp: 'desc' }
      }),
      this.prisma.waterSensor.findMany({
        include: {
          readings: { take: 5, orderBy: { timestamp: 'desc' } }
        }
      }),
      this.prisma.telemetrySample.findMany({
        take: 500,
        orderBy: { timestamp: 'desc' }
      }),
      this.prisma.incident.findMany({
        where: { status: { notIn: ['resolved'] } }
      }),
      this.prisma.citizenServiceRequest.findMany({
        where: { status: { notIn: ['RESOLVED', 'CLOSED', 'REJECTED'] } }
      }),
      this.prisma.workOrder.findMany({
        where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } }
      })
    ]);

    return {
      generatedAt,
      scenarioId: scenarioId as any,
      modifiers: modifiers || BASELINE_MODIFIERS,
      hotState: {
        traffic: trafficReadings,
        water: waterSensors,
        environment: telemetry.filter(t => ['aqi', 'temperature', 'pm25'].includes(t.metric)),
        waste: telemetry.filter(t => t.metric === 'fill_level'),
        energy: telemetry.filter(t => t.metric === 'load' || t.metric === 'voltage'),
        transit: telemetry.filter(t => t.metric === 'delay' || t.metric === 'occupancy'),
        emergency: activeIncidents,
        citizen: serviceRequests,
        infrastructure: workOrders,
      }
    };
  }

  private async saveSnapshots(results: PredictionResult[], generatedAt: Date, scenarioId: string) {
    if (results.length === 0) return;
    const data = results.map(r => ({
      domain: r.domain,
      entityType: r.entityType,
      entityId: r.entityId,
      metric: r.metric,
      horizonMinutes: r.horizonMinutes,
      predictedValue: r.predictedValue,
      confidence: r.confidence,
      baselineValue: r.baselineValue,
      trend: r.trend,
      riskLevel: r.riskLevel,
      method: r.method,
      factors: r.factors as any,
      generatedAt,
      expiresAt: new Date(generatedAt.getTime() + r.horizonMinutes * 60000),
      scenarioId,
    }));

    await this.prisma.predictionSnapshot.createMany({ data });
  }

  private async emitAlertsAndUpdates(results: PredictionResult[]) {
    this.io.emit(SOCKET_EVENTS.predictionUpdate as any || "prediction:update", results);

    for (const res of results) {
      if (res.riskLevel === 'HIGH' || res.riskLevel === 'CRITICAL') {
        // Emit via Event Fabric (handles dedup automatically via its internal state)
        await emitEventTransition(this.prisma, this.io, {
          type: `PREDICTIVE_${res.domain.toUpperCase()}_RISK`,
          severity: res.riskLevel,
          description: `Predicted ${res.metric} reaching ${res.riskLevel} levels in ${res.horizonMinutes}m. Trend: ${res.trend}.`,
          assetId: res.entityType === 'asset' ? (res.entityId || undefined) : undefined,
          zoneId: res.entityType === 'zone' ? (res.entityId || undefined) : undefined,
          source: 'prediction_engine',
          confidence: res.confidence,
          metadata: { factors: res.factors, predictedValue: res.predictedValue }
        });
        
        // Broadcast specific risk event for UI overlays
        this.io.emit(SOCKET_EVENTS.predictionRisk as any || "prediction:risk", res);
      }
    }
  }

  private async cleanupOldSnapshots() {
    const threshold = new Date(Date.now() - 48 * 60 * 60 * 1000);
    await this.prisma.predictionSnapshot.deleteMany({
      where: { generatedAt: { lt: threshold } }
    });
  }
}
