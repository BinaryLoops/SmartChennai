import { PredictionProvider, PredictionRequest, PredictionResult, PredictionContext, PredictionFactor } from "./types";
import { calculateEWA, calculateRollingSlope, determineTrend } from "./features";
import { computeConfidence } from "./confidence";

export const environmentPredictor: PredictionProvider = {
  name: "environmentPredictor",
  async predict(req: PredictionRequest, ctx: PredictionContext): Promise<PredictionResult[]> {
    const results: PredictionResult[] = [];
    const telemetry = ctx.hotState.environment;
    
    // Group by metric then asset
    const aqiData = telemetry.filter(t => t.metric === 'aqi');
    
    const byAsset = new Map<string, any[]>();
    for (const r of aqiData) {
      if (!byAsset.has(r.assetId)) byAsset.set(r.assetId, []);
      byAsset.get(r.assetId)!.push(r);
    }

    for (const [assetId, readings] of byAsset.entries()) {
      if (readings.length === 0) continue;
      
      const values = readings.map(r => r.value);
      const ewa = calculateEWA(values);
      const slope = calculateRollingSlope(values);
      
      const aqiMod = ctx.modifiers.aqiMultiplier || 0;
      
      for (const horizon of req.horizonMinutes) {
        let predicted = ewa + (slope * horizon / 5);
        predicted = predicted * (1 + aqiMod);
        predicted = Math.max(0, predicted);

        const trend = determineTrend(slope);
        
        let riskLevel: "LOW" | "MODERATE" | "HIGH" | "CRITICAL" = "LOW";
        if (predicted > 300) riskLevel = "CRITICAL";
        else if (predicted > 200) riskLevel = "HIGH";
        else if (predicted > 100) riskLevel = "MODERATE";

        const factors: PredictionFactor[] = [];
        if (aqiMod !== 0) {
          factors.push({ key: "scenario_aqi", label: "Scenario AQI Modifier", contribution: aqiMod * 100, direction: aqiMod > 0 ? "INCREASE" : "DECREASE" });
        }

        const confidence = computeConfidence({
          dataPoints: values.length,
          maxDataPoints: 10,
          variance: 0.1,
          isScenarioActive: ctx.scenarioId !== "NORMAL_DAY",
          timeSinceLastUpdateMinutes: (ctx.generatedAt.getTime() - new Date(readings[0].timestamp).getTime()) / 60000
        });

        results.push({
          domain: "environment",
          entityType: "sensor",
          entityId: assetId,
          metric: "aqi",
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
