import { PredictionRiskLevel } from "@prisma/client";
import { CausalModifiers, ScenarioId } from "../../packages/types/scenarios";

export interface PredictionFactor {
  key: string;
  label: string;
  contribution: number; // e.g. 0.12 for +12%
  direction: "INCREASE" | "DECREASE" | "NEUTRAL";
}

export interface PredictionResult {
  domain: string;
  entityType: string;
  entityId: string | null;
  metric: string;
  horizonMinutes: number;
  predictedValue: number;
  confidence: number;
  baselineValue: number;
  trend: "RISING" | "STABLE" | "FALLING";
  riskLevel: PredictionRiskLevel;
  method: string;
  factors: PredictionFactor[];
}

export interface PredictionContext {
  generatedAt: Date;
  scenarioId: ScenarioId;
  modifiers: CausalModifiers;
  // Shared domain snapshots
  hotState: {
    traffic: any[];
    water: any[];
    environment: any[];
    waste: any[];
    energy: any[];
    transit: any[];
    emergency: any[];
    citizen: any[];
    infrastructure: any[];
  };
}

export interface PredictionRequest {
  domain: string;
  horizonMinutes: number[];
}

export interface PredictionProvider {
  name: string;
  predict(req: PredictionRequest, ctx: PredictionContext): Promise<PredictionResult[]>;
}
