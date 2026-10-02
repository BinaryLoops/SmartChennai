import { PredictionProvider, PredictionRequest, PredictionResult, PredictionContext, PredictionFactor } from "./types";

export const infrastructurePredictor: PredictionProvider = {
  name: "infrastructurePredictor",
  async predict(req: PredictionRequest, ctx: PredictionContext): Promise<PredictionResult[]> {
    const results: PredictionResult[] = [];
    const workOrders = ctx.hotState.infrastructure;
    
    // Only look at WOs with an SLA deadline
    const atRiskWOs = workOrders.filter(wo => wo.slaDueAt);

    for (const wo of atRiskWOs) {
      const msUntilDue = new Date(wo.slaDueAt).getTime() - ctx.generatedAt.getTime();
      const minutesUntilDue = msUntilDue / 60000;
      
      for (const horizon of req.horizonMinutes) {
        let riskScore = 0; // 0-1
        
        const predictedMinutesLeft = minutesUntilDue - horizon;
        
        if (predictedMinutesLeft < 0) {
          riskScore = 1.0; // Breached
        } else if (predictedMinutesLeft < 60) {
          riskScore = 0.8; // Critical risk
        } else if (predictedMinutesLeft < 240) {
          riskScore = 0.5; // Moderate risk
        } else {
          riskScore = 0.1; // Low risk
        }

        // Adjust for priority
        if (wo.priority === 'CRITICAL') riskScore *= 1.2;
        if (wo.priority === 'HIGH') riskScore *= 1.1;

        riskScore = Math.min(1.0, riskScore);

        let riskLevel: "LOW" | "MODERATE" | "HIGH" | "CRITICAL" = "LOW";
        if (riskScore >= 0.8) riskLevel = "CRITICAL";
        else if (riskScore >= 0.6) riskLevel = "HIGH";
        else if (riskScore >= 0.4) riskLevel = "MODERATE";

        const trend = riskScore > 0.5 ? "RISING" : "STABLE";

        const factors: PredictionFactor[] = [
          { key: "sla_deadline", label: "SLA Deadline Proximity", contribution: (1 - (Math.max(0, predictedMinutesLeft) / 1440)) * 100, direction: "INCREASE" },
          { key: "priority", label: `Priority: ${wo.priority}`, contribution: wo.priority === 'CRITICAL' ? 20 : 0, direction: "INCREASE" }
        ];

        results.push({
          domain: "infrastructure",
          entityType: "workOrder",
          entityId: wo.id,
          metric: "slaBreachRisk",
          horizonMinutes: horizon,
          predictedValue: riskScore * 100,
          confidence: 0.9, // high confidence because it's deterministic deadline math
          baselineValue: 0,
          trend,
          riskLevel,
          method: "DEADLINE_ARITHMETIC",
          factors
        });
      }
    }
    
    // Sort by risk and only keep top 20 to avoid spam
    results.sort((a, b) => b.predictedValue - a.predictedValue);
    
    return results.slice(0, 20);
  }
};
