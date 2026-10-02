export function computeConfidence(params: {
  dataPoints: number;
  maxDataPoints: number;
  variance: number;
  isScenarioActive: boolean;
  timeSinceLastUpdateMinutes: number;
}): number {
  let score = 1.0;

  // Penalty for low data points (e.g. need at least 10 for full confidence)
  const dataRatio = Math.min(params.dataPoints / params.maxDataPoints, 1.0);
  if (dataRatio < 0.5) score -= 0.3;
  else if (dataRatio < 1.0) score -= 0.1;

  // Penalty for high variance (normalized 0 to 1)
  if (params.variance > 0.5) score -= 0.2;
  else if (params.variance > 0.2) score -= 0.1;

  // Penalty for stale data
  if (params.timeSinceLastUpdateMinutes > 15) score -= 0.2;
  else if (params.timeSinceLastUpdateMinutes > 5) score -= 0.1;

  // Boost for known scenarios because causes are well understood
  if (params.isScenarioActive) {
    score = Math.min(1.0, score + 0.1);
  }

  return Math.max(0.1, score);
}
