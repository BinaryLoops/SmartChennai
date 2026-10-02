import { PredictionProvider, PredictionRequest, PredictionResult, PredictionContext, PredictionFactor } from "./types";
import { calculateEWA, calculateRollingSlope, determineTrend } from "./features";
import { computeConfidence } from "./confidence";

export const energyPredictor: PredictionProvider = {
  name: "energyPredictor",
  async predict(req: PredictionRequest, ctx: PredictionContext): Promise<PredictionResult[]> {
    const results: PredictionResult[] = [];
    const telemetry = ctx.hotState.energy.filter(t => t.metric === 'load');
    
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
      
      const gridAvail = ctx.modifiers.powerGridAvailability; // normally 1.0
      const tempShift = ctx.modifiers.temperatureShift || 0;
      
      for (const horizon of req.horizonMinutes) {
        let predictedLoad = ewa + (slope * horizon / 5);
        if (tempShift > 0) predictedLoad *= (1 + (tempShift * 0.05)); // heat increases load
        
        let riskScore = predictedLoad / 100; // assuming load normalized to 100
        if (gridAvail < 1.0) riskScore *= (1 / gridAvail); // less availability = higher risk

        const trend = determineTrend(slope);
        
        let riskLevel: "LOW" | "MODERATE" | "HIGH" | "CRITICAL" = "LOW";
        if (gridAvail === 0) riskLevel = "CRITICAL"; // Complete outage
        else if (riskScore > 0.9) riskLevel = "CRITICAL";
        else if (riskScore > 0.75) riskLevel = "HIGH";
        else if (riskScore > 0.6) riskLevel = "MODERATE";

        const factors: PredictionFactor[] = [];
        if (tempShift > 0) factors.push({ key: "heat_load", label: "Heat-induced Load", contribution: tempShift * 5, direction: "INCREASE" });
        if (gridAvail < 1.0) factors.push({ key: "grid_availability", label: "Grid Degradation", contribution: (1 - gridAvail) * 100, direction: "INCREASE" });

        const confidence = computeConfidence({
          dataPoints: values.length,
          maxDataPoints: 10,
          variance: 0.1,
          isScenarioActive: ctx.scenarioId !== "NORMAL_DAY",
          timeSinceLastUpdateMinutes: (ctx.generatedAt.getTime() - new Date(readings[0].timestamp).getTime()) / 60000
        });

        results.push({
          domain: "energy",
          entityType: "asset",
          entityId: assetId,
          metric: "loadRisk",
          horizonMinutes: horizon,
          predictedValue: gridAvail === 0 ? 100 : Math.min(100, riskScore * 100),
          confidence,
          baselineValue: ewa,
          trend: gridAvail === 0 ? "STABLE" : trend,
          riskLevel,
          method: "EWA_CAUSAL_MODIFIER",
          factors
        });
      }
    }
    
    return results;
  }
};
