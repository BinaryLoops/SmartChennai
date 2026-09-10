/**
 * Multi-Criteria Decision Analysis (MCDA) Priority Scoring Engine
 *
 * This engine calculates an objective, deterministic priority score (0–100)
 * for incidents based on multi-attribute utility theory using three weighted criteria:
 *
 * Formula:
 *   Score = (w_sev * S + w_src * R + w_loc * L) * 100
 *
 * Criteria & Weight Distributions:
 *
 * 1. Severity Criterion (w_sev = 0.40):
 *    - Captures the reported physical intensity/danger (1 to 5).
 *    - Normalized to [0, 1]: S = (severity - 1) / 4
 *    - Severity 1 (Minor)        -> S = 0.00
 *    - Severity 2 (Moderate)     -> S = 0.25
 *    - Severity 3 (Significant)  -> S = 0.50
 *    - Severity 4 (Severe)       -> S = 0.75
 *    - Severity 5 (Catastrophic) -> S = 1.00
 *
 * 2. Source Reliability Criterion (w_src = 0.25):
 *    - Accounts for verification authenticity of the reporting entity.
 *    - Department (police/fire/ICCC operator): R = 1.00 (verified by official personnel)
 *    - Sensor (automated IoT threshold trip):   R = 0.85 (calibrated physical telemetry)
 *    - Citizen (crowdsourced mobile reports):    R = 0.50 baseline.
 *      Each independent corroborating citizen report (reportedBy - 1) adds +0.10
 *      credibility, scaling up to a max of 1.00:
 *      R_citizen = min(1.00, 0.50 + 0.10 * (reportedBy - 1))
 *
 * 3. Location Criticality Criterion (w_loc = 0.35):
 *    - Accounts for proximity to key transit infrastructure, junctions, and high-density corridors.
 *    - Distance to nearest major junction:
 *        * d < 300m  -> L = 0.95 (direct critical junction gridlock or hazard)
 *        * d < 800m  -> L = 0.80 (major arterial transit corridor)
 *        * d < 1500m -> L = 0.60 (urban neighborhood feeder road)
 *        * d >= 1500m -> L = 0.40 (outer perimeter / residential)
 *
 * Priority Bands:
 *   - Critical : Score >= 80
 *   - High     : 60 <= Score < 80
 *   - Medium   : 40 <= Score < 60
 *   - Low      : Score < 40
 */

export const MCDA_WEIGHTS = {
  severity: 0.40,
  source: 0.25,
  location: 0.35,
} as const;

export type PriorityBand = "low" | "medium" | "high" | "critical";

export interface MCDAInput {
  severity?: number; // 1 to 5
  source?: "citizen" | "sensor" | "department";
  reportedBy?: number; // dedup count
  distanceToNearestJunctionKm?: number; // in kilometers
}

export interface MCDAResult {
  score: number; // 0 to 100, rounded to 1 decimal place
  band: PriorityBand;
  breakdown: {
    normalizedSeverity: number;
    sourceReliability: number;
    locationCriticality: number;
    weightedSeverity: number;
    weightedSource: number;
    weightedLocation: number;
  };
}

export function calculateMCDAPriority(input: MCDAInput): MCDAResult {
  // 1. Severity Score (0.0 to 1.0)
  const rawSeverity = Math.min(5, Math.max(1, input.severity ?? 2));
  const normalizedSeverity = (rawSeverity - 1) / 4;

  // 2. Source Reliability Score (0.0 to 1.0)
  let sourceReliability = 0.50;
  const source = input.source ?? "citizen";
  const reportedBy = Math.max(1, input.reportedBy ?? 1);

  if (source === "department") {
    sourceReliability = 1.00;
  } else if (source === "sensor") {
    sourceReliability = 0.85;
  } else {
    // Citizen source: corroborated reports boost reliability
    sourceReliability = Math.min(1.00, 0.50 + 0.10 * (reportedBy - 1));
  }

  // 3. Location Criticality Score (0.0 to 1.0)
  let locationCriticality = 0.60; // Default moderate urban density
  if (typeof input.distanceToNearestJunctionKm === "number") {
    const d = input.distanceToNearestJunctionKm;
    if (d < 0.300) {
      locationCriticality = 0.95;
    } else if (d < 0.800) {
      locationCriticality = 0.80;
    } else if (d < 1.500) {
      locationCriticality = 0.60;
    } else {
      locationCriticality = 0.40;
    }
  }

  // Calculate Weighted Sum
  const weightedSeverity = MCDA_WEIGHTS.severity * normalizedSeverity;
  const weightedSource = MCDA_WEIGHTS.source * sourceReliability;
  const weightedLocation = MCDA_WEIGHTS.location * locationCriticality;

  const rawScore = (weightedSeverity + weightedSource + weightedLocation) * 100;
  const score = Math.round(rawScore * 10) / 10; // Round to 1 decimal place

  let band: PriorityBand = "low";
  if (score >= 80) band = "critical";
  else if (score >= 60) band = "high";
  else if (score >= 40) band = "medium";
  else band = "low";

  return {
    score,
    band,
    breakdown: {
      normalizedSeverity,
      sourceReliability,
      locationCriticality,
      weightedSeverity,
      weightedSource,
      weightedLocation,
    },
  };
}
