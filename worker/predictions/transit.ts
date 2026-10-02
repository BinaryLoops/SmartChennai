import { PredictionProvider, PredictionRequest, PredictionResult, PredictionContext, PredictionFactor } from "./types";
import { calculateEWA, calculateRollingSlope, determineTrend } from "./features";
import { computeConfidence } from "./confidence";

export const transitPredictor: PredictionProvider = {
  name: "transitPredictor",
  async predict(req: PredictionRequest, ctx: PredictionContext): Promise<PredictionResult[]> {
    const results: PredictionResult[] = [];
    const telemetry = ctx.hotState.transit.filter(t => t.metric === 'delay');
    
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
      
      const trafficFriction = ctx.modifiers.trafficFriction || 0;
      
      for (const horizon of req.horizonMinutes) {
        let predictedDelay = ewa + (slope * horizon / 5);
        predictedDelay += (trafficFriction * horizon * 0.5); // friction compounds over time
        predictedDelay = Math.max(0, predictedDelay);

        const trend = determineTrend(slope);
        
        let riskLevel: "LOW" | "MODERATE" | "HIGH" | "CRITICAL" = "LOW";
        if (predictedDelay > 30) riskLevel = "CRITICAL";
        else if (predictedDelay > 15) riskLevel = "HIGH";
        else if (predictedDelay > 5) riskLevel = "MODERATE";

        const factors: PredictionFactor[] = [];
        if (trafficFriction > 0) factors.push({ key: "traffic_friction", label: "Traffic Congestion Delay", contribution: trafficFriction * 100, direction: "INCREASE" });

        const confidence = computeConfidence({
          dataPoints: values.length,
          maxDataPoints: 10,
          variance: 0.2,
          isScenarioActive: ctx.scenarioId !== "NORMAL_DAY",
          timeSinceLastUpdateMinutes: (ctx.generatedAt.getTime() - new Date(readings[0].timestamp).getTime()) / 60000
        });

        results.push({
          domain: "transit",
          entityType: "route",
          entityId: assetId, // Actually vehicle or route id
          metric: "delay",
          horizonMinutes: horizon,
          predictedValue: predictedDelay,
          confidence,
          baselineValue: ewa,
          trend,
          riskLevel,
          method: "EWA_CROSS_SECTOR",
          factors
        });
      }
    }
    
    return results;
  }
};
