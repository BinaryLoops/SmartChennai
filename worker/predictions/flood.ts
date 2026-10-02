import { PredictionProvider, PredictionRequest, PredictionResult, PredictionContext, PredictionFactor } from "./types";
import { calculateEWA, calculateRollingSlope, determineTrend } from "./features";
import { computeConfidence } from "./confidence";

export const floodPredictor: PredictionProvider = {
  name: "floodPredictor",
  async predict(req: PredictionRequest, ctx: PredictionContext): Promise<PredictionResult[]> {
    const results: PredictionResult[] = [];
    const sensors = ctx.hotState.water;

    for (const s of sensors) {
      if (!s.readings || s.readings.length === 0) continue;
      
      const values = s.readings.map((r: any) => r.waterLevel);
      const ewa = calculateEWA(values);
      const slope = calculateRollingSlope(values);
      
      const floodMod = ctx.modifiers.floodRiskMultiplier || 0;
      const rainMod = ctx.modifiers.rainfallMultiplier || 0;
      
      for (const horizon of req.horizonMinutes) {
        let predictedRisk = (ewa / 200) + (slope * horizon / 60); // proxy risk score 0-1
        predictedRisk = predictedRisk * (1 + floodMod + rainMod * 0.1);
        predictedRisk = Math.min(1.0, Math.max(0.0, predictedRisk));

        const trend = determineTrend(slope);
        
        let riskLevel: "LOW" | "MODERATE" | "HIGH" | "CRITICAL" = "LOW";
        if (predictedRisk > 0.8) riskLevel = "CRITICAL";
        else if (predictedRisk > 0.6) riskLevel = "HIGH";
        else if (predictedRisk > 0.4) riskLevel = "MODERATE";

        const factors: PredictionFactor[] = [];
        if (rainMod > 0) factors.push({ key: "rainfall", label: "Heavy Rainfall", contribution: rainMod * 10, direction: "INCREASE" });
        if (floodMod > 0) factors.push({ key: "scenario_flood", label: "Scenario Flood Risk", contribution: floodMod * 100, direction: "INCREASE" });

        const confidence = computeConfidence({
          dataPoints: values.length,
          maxDataPoints: 5,
          variance: 0.05,
          isScenarioActive: ctx.scenarioId !== "NORMAL_DAY",
          timeSinceLastUpdateMinutes: (ctx.generatedAt.getTime() - new Date(s.readings[0].timestamp).getTime()) / 60000
        });

        results.push({
          domain: "flood",
          entityType: "zone",
          entityId: s.zoneId,
          metric: "floodRisk",
          horizonMinutes: horizon,
          predictedValue: predictedRisk * 100, // 0-100 scale
          confidence,
          baselineValue: (ewa / 200) * 100,
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
