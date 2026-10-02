export function calculateEWA(values: number[], alpha: number = 0.3): number {
  if (values.length === 0) return 0;
  let ewa = values[0];
  for (let i = 1; i < values.length; i++) {
    ewa = alpha * values[i] + (1 - alpha) * ewa;
  }
  return ewa;
}

export function calculateRollingSlope(values: number[]): number {
  if (values.length < 2) return 0;
  const recent = values.slice(-5); // take last 5
  const n = recent.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += recent[i];
    sumXY += i * recent[i];
    sumX2 += i * i;
  }
  const denominator = (n * sumX2 - sumX * sumX);
  if (denominator === 0) return 0;
  return (n * sumXY - sumX * sumY) / denominator;
}

export function determineTrend(slope: number, threshold: number = 0.05): "RISING" | "STABLE" | "FALLING" {
  if (slope > threshold) return "RISING";
  if (slope < -threshold) return "FALLING";
  return "STABLE";
}
