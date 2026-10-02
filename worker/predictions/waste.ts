import { PredictionProvider, PredictionRequest, PredictionResult, PredictionContext, PredictionFactor } from "./types";
import { calculateEWA, calculateRollingSlope, determineTrend } from "./features";
import { computeConfidence } from "./confidence";

export const wastePredictor: PredictionProvider = {
  name: "wastePredictor",
  async predict(req: PredictionRequest, ctx: PredictionContext): Promise<PredictionResult[]> {
    const results: PredictionResult[] = [];
    const telemetry = ctx.hotState.waste;
    
    const byAsset = new Map<string, any[]>();
    for (const r of telemetry) {
      if (!byAsset.has(r.assetId)) byAsset.set(r.assetId, []);
      byAsset.get(r.assetId)!.push(r);
    }

    for (const [assetId, readings] of byAsset.entries()) {
      if (readings.length === 0) continue;
      
      const values = readings.map(r => r.value);
      const ewa = calculateEWA(values);
      const slope = calculateRollingSlope(values);
      
      const wasteMod = ctx.modifiers.wasteGenerationMultiplier || 0;
      
      for (const horizon of req.horizonMinutes) {
        let predicted = ewa + (slope * horizon / 5);
        predicted = predicted * (1 + wasteMod);
        predicted = Math.min(100, Math.max(0, predicted));

        const trend = determineTrend(slope);
        
        let riskLevel: "LOW" | "MODERATE" | "HIGH" | "CRITICAL" = "LOW";
        if (predicted > 90) riskLevel = "CRITICAL";
        else if (predicted > 75) riskLevel = "HIGH";
        else if (predicted > 50) riskLevel = "MODERATE";

        const factors: PredictionFactor[] = [];
        if (wasteMod !== 0) {
          factors.push({ key: "scenario_waste", label: "Scenario Waste Generation", contribution: wasteMod * 100, direction: wasteMod > 0 ? "INCREASE" : "DECREASE" });
        }

        const confidence = computeConfidence({
          dataPoints: values.length,
          maxDataPoints: 10,
          variance: 0.05,
          isScenarioActive: ctx.scenarioId !== "NORMAL_DAY",
          timeSinceLastUpdateMinutes: (ctx.generatedAt.getTime() - new Date(readings[0].timestamp).getTime()) / 60000
        });

        results.push({
          domain: "waste",
          entityType: "bin",
          entityId: assetId,
          metric: "overflowProb",
          horizonMinutes: horizon,
          predictedValue: predicted,
          confidence,
          baselineValue: ewa,
          trend,
          riskLevel,
          method: "EWA_CAUSAL_MODIFIER",
          factors
        });
      }
    }
    
    return results;
  }
};
