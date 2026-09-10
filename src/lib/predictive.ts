/**
 * Server-side client for interacting with the Phase 7 Predictive AI Microservice.
 * This should ONLY be used in Server Components or Server Actions.
 */

const FASTAPI_URL = process.env.FASTAPI_URL || "http://localhost:8000";

interface CongestionPrediction {
  timestamp: string;
  predictedVph: number;
  lowerBound: number;
  upperBound: number;
}

interface CongestionResponse {
  junctionId: string;
  predictions: CongestionPrediction[];
  modelUsed: string;
}

interface FloodRiskResponse {
  zoneId: string;
  riskScore: number;
  riskCategory: string;
  factors: string[];
}

interface AnomalyResponse {
  isAnomaly: boolean;
  currentValue: number;
  rollingMean: number;
  standardDeviation: number;
  threshold: number;
  details: string;
}

/**
 * Predict traffic congestion for the next 30 minutes.
 */
export async function getCongestionPrediction(junctionId: string): Promise<CongestionResponse | null> {
  try {
    const res = await fetch(`${FASTAPI_URL}/predict/congestion`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ junctionId }),
      next: { revalidate: 60 }, // Cache for 60 seconds
      signal: AbortSignal.timeout(5000), // 5s timeout
    });
    
    if (!res.ok) {
      console.warn(`[Predictive API] Congestion returned ${res.status}`);
      return null;
    }
    
    return await res.json();
  } catch (err) {
    console.warn(`[Predictive API] Congestion error:`, err);
    return null;
  }
}

/**
 * Calculate flood risk based on current water level.
 */
export async function getFloodRiskPrediction(zoneId: string, currentWaterLevel: number, rainfall: number = 0): Promise<FloodRiskResponse | null> {
  try {
    const res = await fetch(`${FASTAPI_URL}/predict/flood-risk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ zoneId, currentWaterLevel, rainfall }),
      next: { revalidate: 30 }, // Cache for 30 seconds
      signal: AbortSignal.timeout(3000),
    });
    
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn(`[Predictive API] Flood risk error:`, err);
    return null;
  }
}

/**
 * Detect if the current traffic value is an anomaly.
 */
export async function detectAnomaly(junctionId: string, currentValue: number, recentReadings: number[]): Promise<AnomalyResponse | null> {
  try {
    const res = await fetch(`${FASTAPI_URL}/predict/anomaly`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ junctionId, currentValue, recentReadings }),
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(3000),
    });
    
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn(`[Predictive API] Anomaly error:`, err);
    return null;
  }
}
