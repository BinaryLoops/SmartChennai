import { PredictionProvider, PredictionRequest, PredictionResult, PredictionContext, PredictionFactor } from "./types";
import { computeConfidence } from "./confidence";

export const emergencyPredictor: PredictionProvider = {
  name: "emergencyPredictor",
  async predict(req: PredictionRequest, ctx: PredictionContext): Promise<PredictionResult[]> {
    const results: PredictionResult[] = [];
    const activeIncidents = ctx.hotState.emergency;
    
    // Group incidents by zone (for simplicity, we assume global if no zone)
    const activeCount = activeIncidents.length;
    const demandMod = ctx.modifiers.emergencyDemandMultiplier || 0;
    
    for (const horizon of req.horizonMinutes) {
      // Baseline 5 incidents + current active + scenario multiplier
      let predictedDemand = (5 + activeCount) * (1 + demandMod);
      
      let riskLevel: "LOW" | "MODERATE" | "HIGH" | "CRITICAL" = "LOW";
      if (predictedDemand > 20) riskLevel = "CRITICAL";
      else if (predictedDemand > 12) riskLevel = "HIGH";
      else if (predictedDemand > 8) riskLevel = "MODERATE";

      const factors: PredictionFactor[] = [
        { key: "active_incidents", label: "Current Active Incidents", contribution: activeCount * 5, direction: "INCREASE" }
      ];
      if (demandMod > 0) {
        factors.push({ key: "scenario_demand", label: "Scenario Emergency Demand", contribution: demandMod * 100, direction: "INCREASE" });
      }

      const confidence = computeConfidence({
        dataPoints: 10,
        maxDataPoints: 10,
        variance: 0.1,
        isScenarioActive: ctx.scenarioId !== "NORMAL_DAY",
        timeSinceLastUpdateMinutes: 0
      });

      results.push({
        domain: "emergency",
        entityType: "global",
        entityId: "citywide",
        metric: "demandPressure",
        horizonMinutes: horizon,
        predictedValue: predictedDemand,
        confidence,
        baselineValue: activeCount,
        trend: demandMod > 0 ? "RISING" : "STABLE",
        riskLevel,
        method: "CAUSAL_AGGREGATE",
        factors
      });
    }
    
    return results;
  }
};
