/**
 * Causal Scenario Modifiers
 * Modifiers represent additive percentage impacts where:
 * 0.00 = no additional impact
 * 0.10 = +10% impact
 * -0.50 = -50% impact
 * 
 * Therefore: finalValue = baselineValue * (1 + modifier)
 */
export interface CausalModifiers {
  trafficFriction: number;
  waterLevelMultiplier: number;
  drainageLoad: number;
  floodRiskMultiplier: number;
  aqiMultiplier: number;
  temperatureShift: number;
  rainfallMultiplier?: number;
  noiseMultiplier?: number;
  pm25Multiplier?: number;
  powerGridAvailability: number;
  wasteGenerationMultiplier: number;
  emergencyDemandMultiplier: number;
}

export type ScenarioId = 
  | "NORMAL_DAY" 
  | "HEAVY_RAIN" 
  | "URBAN_FLOOD" 
  | "MAJOR_TRAFFIC_ACCIDENT" 
  | "POWER_OUTAGE" 
  | "WATER_PIPELINE_FAILURE" 
  | "LARGE_PUBLIC_EVENT" 
  | "EXTREME_HEAT" 
  | "MULTI_INCIDENT" 
  | "RECOVERY_MODE";

export interface ScenarioDefinition {
  id: ScenarioId;
  name: string;
  description: string;
  // The target modifiers to apply when severity is 1.0
  targetModifiers: Partial<CausalModifiers>;
  // Event triggers that happen when this scenario is active
  events: {
    threshold: number; // When the scenario onset reaches this %, fire event
    type: string;
    severity: string;
    description: string;
    category: "primary" | "secondary" | "downstream";
  }[];
}

export interface CausalHistoryEntry {
  id: string;
  timestamp: string;
  scenarioId: ScenarioId;
  message: string;
  type: "start" | "effect" | "recovery" | "stop";
}

export interface ScenarioStatePayload {
  activeScenarioId: ScenarioId;
  status: "idle" | "active" | "recovering" | "pause";
  startedAt: string | null;
  elapsedSeconds: number;
  severity: number; // 0.1 to 1.0
  affectedZones: string[]; // empty means global
  simulationSpeed: number;
  
  // The current computed modifiers (gradual onset applied)
  currentModifiers: CausalModifiers;
  
  // History bounded to latest 20 events
  history: CausalHistoryEntry[];
}

export interface ScenarioCommandPayload {
  action: "start" | "stop" | "pause" | "resume";
  scenarioId?: ScenarioId;
  severity?: number;
  affectedZones?: string[];
  simulationSpeed?: number;
}
