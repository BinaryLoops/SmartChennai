import { PredictionProvider, PredictionRequest, PredictionResult, PredictionContext, PredictionFactor } from "./types";
import { computeConfidence } from "./confidence";

export const citizenServicesPredictor: PredictionProvider = {
  name: "citizenServicesPredictor",
  async predict(req: PredictionRequest, ctx: PredictionContext): Promise<PredictionResult[]> {
    const results: PredictionResult[] = [];
    const requests = ctx.hotState.citizen;
    
    // Calculate volume by category
    const byCategory = new Map<string, number>();
    for (const r of requests) {
      byCategory.set(r.category, (byCategory.get(r.category) || 0) + 1);
    }

    const rainMod = ctx.modifiers.rainfallMultiplier || 0;
    const powerMod = 1 - (ctx.modifiers.powerGridAvailability || 1); // 0 grid = 1.0 mod

    // Predict for specific sensitive categories
    const targetCategories = ['DRAINAGE', 'STREETLIGHT'];

    for (const category of targetCategories) {
      const currentVol = byCategory.get(category) || 0;
      let causalMod = 0;
      let factorKey = "";
      
      if (category === 'DRAINAGE') {
        causalMod = rainMod;
        factorKey = "rainfall";
      } else if (category === 'STREETLIGHT') {
        causalMod = powerMod;
        factorKey = "power_outage";
      }

      for (const horizon of req.horizonMinutes) {
        let predictedVolume = currentVol + (causalMod * horizon * 0.1);
        
        let riskLevel: "LOW" | "MODERATE" | "HIGH" | "CRITICAL" = "LOW";
        if (predictedVolume > 20) riskLevel = "CRITICAL";
        else if (predictedVolume > 10) riskLevel = "HIGH";
        else if (predictedVolume > 5) riskLevel = "MODERATE";

        const factors: PredictionFactor[] = [
          { key: "current_backlog", label: "Current Open Requests", contribution: currentVol * 5, direction: "INCREASE" }
        ];
        if (causalMod > 0) {
          factors.push({ key: factorKey, label: `Scenario Impact (${factorKey})`, contribution: causalMod * 100, direction: "INCREASE" });
        }

        const confidence = computeConfidence({
          dataPoints: 10,
          maxDataPoints: 10,
          variance: 0.1,
          isScenarioActive: causalMod > 0,
          timeSinceLastUpdateMinutes: 0
        });

        results.push({
          domain: "citizen",
          entityType: "category",
          entityId: category,
          metric: "volumeTrend",
          horizonMinutes: horizon,
          predictedValue: predictedVolume,
          confidence,
          baselineValue: currentVol,
          trend: causalMod > 0 ? "RISING" : "STABLE",
          riskLevel,
          method: "CAUSAL_SCENARIO",
          factors
        });
      }
    }
    
    return results;
  }
};
