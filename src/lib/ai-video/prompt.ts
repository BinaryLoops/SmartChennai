import { AIGenerationContext } from "./types";

const CAMERA_SCENES: Record<string, string> = {
  "CAM-KTP-01": "Fixed CCTV camera, elevated roadside view, Kathipara junction Chennai. Major flyover interchange. Multiple lanes.",
  "CAM-TYN-03": "Fixed CCTV camera, elevated view, T. Nagar junction Chennai. Dense commercial area, shops, pedestrians, urban buildings.",
  "CAM-MAR-02": "Fixed CCTV camera, coastal road view, Marina Beach Road Chennai. Palm trees, wide road, evening lighting, coastal atmosphere.",
  "CAM-AMB-04": "Fixed CCTV camera, industrial area view, Ambattur Chennai. Wide roads, industrial surroundings.",
};

function getTrafficPrompt(congestion: number): string {
  if (congestion > 0.8) {
    return "Severe congestion, stopped vehicles, traffic jam. Very dense.";
  } else if (congestion > 0.6) {
    return "Heavy traffic, slow moving vehicles, dense.";
  } else if (congestion > 0.3) {
    return "Moderate traffic, steady flow of vehicles.";
  }
  return "Light traffic, fast moving vehicles.";
}

function getIncidentPrompt(type?: string, severity?: number): string {
  if (!type) return "";
  const severityDesc = severity && severity > 3 ? "Major" : "Minor";
  return `${severityDesc} ${type.toLowerCase()} visible on the road, disrupting traffic flow. Emergency conditions.`;
}

export function buildPrompt(context: AIGenerationContext): string {
  const baseScene = CAMERA_SCENES[context.cameraId] || "Fixed CCTV camera, elevated view, Chennai intersection.";
  const trafficScene = getTrafficPrompt(context.congestion);
  const incidentScene = getIncidentPrompt(context.incidentType, context.incidentSeverity);

  return [
    baseScene,
    trafficScene,
    incidentScene,
    "Realistic Indian urban environment, cars, buses, motorcycles, autos.",
    "Surveillance style, static camera, slight digital noise, subtle CCTV compression.",
    "No cinematic camera movement, no zoom, natural vehicle movement."
  ]
    .filter(Boolean)
    .join(" ");
}
