import { PredictionProvider, PredictionRequest, PredictionResult, PredictionContext, PredictionFactor } from "./types";
import { calculateEWA, calculateRollingSlope, determineTrend } from "./features";
import { computeConfidence } from "./confidence";

export const trafficPredictor: PredictionProvider = {
  name: "trafficPredictor",
  async predict(req: PredictionRequest, ctx: PredictionContext): Promise<PredictionResult[]> {
    const results: PredictionResult[] = [];
    const readings = ctx.hotState.traffic;
    
    // Group readings by junction
    const byJunction = new Map<string, any[]>();
    for (const r of readings) {
      if (!byJunction.has(r.junctionId)) byJunction.set(r.junctionId, []);
      byJunction.get(r.junctionId)!.push(r);
    }

    for (const [junctionId, jReadings] of byJunction.entries()) {
      if (jReadings.length === 0) continue;
      
      const values = jReadings.map(r => r.congestionLevel);
      const ewa = calculateEWA(values);
      const slope = calculateRollingSlope(values);
      
      const frictionModifier = ctx.modifiers.trafficFriction || 0;
      
      for (const horizon of req.horizonMinutes) {
        let predicted = ewa + (slope * (horizon / 5)); // 5 min interval approx
        predicted = predicted * (1 + frictionModifier);
        predicted = Math.min(1.0, Math.max(0.0, predicted));

        const trend = determineTrend(slope);
        
        let riskLevel: "LOW" | "MODERATE" | "HIGH" | "CRITICAL" = "LOW";
        if (predicted > 0.85) riskLevel = "CRITICAL";
        else if (predicted > 0.70) riskLevel = "HIGH";
        else if (predicted > 0.50) riskLevel = "MODERATE";

        const factors: PredictionFactor[] = [
          { key: "recent_trend", label: "Recent Congestion Trend", contribution: slope * 100, direction: slope > 0 ? "INCREASE" : slope < 0 ? "DECREASE" : "NEUTRAL" }
        ];

        if (frictionModifier !== 0) {
          factors.push({ key: "scenario_friction", label: "Scenario Traffic Friction", contribution: frictionModifier * 100, direction: frictionModifier > 0 ? "INCREASE" : "DECREASE" });
        }

        const confidence = computeConfidence({
          dataPoints: values.length,
          maxDataPoints: 30,
          variance: 0.1, // simplified
          isScenarioActive: ctx.scenarioId !== "NORMAL_DAY",
          timeSinceLastUpdateMinutes: (ctx.generatedAt.getTime() - new Date(jReadings[0].timestamp).getTime()) / 60000
        });

        results.push({
          domain: "traffic",
          entityType: "junction",
          entityId: junctionId,
          metric: "congestionLevel",
          horizonMinutes: horizon,
          predictedValue: predicted,
          confidence,
          baselineValue: ewa,
          trend,
          riskLevel,
          method: "EWA_SLOPE_MODIFIER",
          factors
        });
      }
    }
    
    return results;
  }
};
