/**
 * Shared contracts for the Smart Chennai ICCC sensor simulation engine.
 * Imported by `worker/simulate.ts` (producer) and, in later phases, the
 * Next.js dashboard (consumer) so both sides stay type-compatible.
 */

export const SOCKET_EVENTS = {
  trafficUpdate: "traffic:update",
  waterUpdate: "water:update",
  incidentNew: "incident:new",
  incidentUpdated: "incident:updated",
  settingsUpdate: "settings:update",
  // STAR ADD-ON #2
  telemetryUpdate: "telemetry:update",
  cityEventNew: "cityEvent:new",
  cityHealthUpdate: "cityHealth:update",
  // STAR ADD-ON #3
  scenarioCommand: "scenario:command",
  scenarioStateUpdate: "scenario:stateUpdate",
} as const;

export type RiskLevel = "normal" | "watch" | "warning" | "danger";

export interface TrafficUpdatePayload {
  junctionId: string;
  junctionName: string;
  zoneId: string;
  lat: number;
  lng: number;
  /** Clamped to 0–12000. */
  vehiclesPerHour: number;
  avgSpeedKph: number;
  /** 0–1. */
  congestionLevel: number;
  /** True when a random traffic spike is active this tick. */
  spiked: boolean;
  /** ISO 8601 timestamp of the reading. */
  timestamp: string;
}

export interface WaterUpdatePayload {
  sensorId: string;
  sensorName: string;
  zoneId: string;
  lat: number;
  lng: number;
  waterLevelCm: number;
  riskLevel: RiskLevel;
  /** True when monsoon simulation is currently enabled. */
  monsoon: boolean;
  timestamp: string;
}

export interface IncidentPayload {
  id: string;
  type: "traffic" | "fire" | "medical" | "flood";
  severity: number; // 1–5
  lat: number;
  lng: number;
  source: "citizen" | "sensor" | "department";
  status: "reported" | "verified" | "dispatched" | "arrived" | "in_progress" | "resolved";
  reportedAt: string;
  reportedBy?: number;
  priorityScore?: number;
  description?: string;
  referenceId?: string;
}

export interface SimulationSettingsPayload {
  monsoonEnabled: boolean;
  demoModeEnabled?: boolean;
}

/** Events the server pushes to connected clients. */
export interface ServerToClientEvents {
  [SOCKET_EVENTS.trafficUpdate]: (payload: TrafficUpdatePayload) => void;
  [SOCKET_EVENTS.waterUpdate]: (payload: WaterUpdatePayload) => void;
  [SOCKET_EVENTS.incidentNew]: (payload: IncidentPayload) => void;
  [SOCKET_EVENTS.incidentUpdated]: (payload: IncidentPayload) => void;
  // STAR ADD-ON #2
  [SOCKET_EVENTS.telemetryUpdate]: (payload: any) => void;
  [SOCKET_EVENTS.cityEventNew]: (payload: any) => void;
  [SOCKET_EVENTS.cityHealthUpdate]: (payload: any) => void;
  // STAR ADD-ON #3
  [SOCKET_EVENTS.scenarioStateUpdate]: (payload: any) => void;
}

/** Events clients may send to the worker. */
export interface ClientToServerEvents {
  [SOCKET_EVENTS.settingsUpdate]: (
    payload: SimulationSettingsPayload,
    ack?: (settings: SimulationSettingsPayload) => void,
  ) => void;
  // STAR ADD-ON #3
  [SOCKET_EVENTS.scenarioCommand]: (
    payload: any,
    ack?: (response: { success: boolean, message?: string }) => void,
  ) => void;
}

/** Water-level thresholds (cm) used to derive riskLevel. */
export const WATER_RISK_THRESHOLDS = { watch: 80, warning: 120, danger: 160 } as const;

export function riskLevelFor(waterLevelCm: number): RiskLevel {
  if (waterLevelCm >= WATER_RISK_THRESHOLDS.danger) return "danger";
  if (waterLevelCm >= WATER_RISK_THRESHOLDS.warning) return "warning";
  if (waterLevelCm >= WATER_RISK_THRESHOLDS.watch) return "watch";
  return "normal";
}

// ── STAR ADD-ON #1 — Asset Registry types ────────────────────────────────────
export type {
  AssetCategory,
  AssetStatus,
  CityAssetRow,
  CityAssetDetail,
  AssetListResponse,
  AssetStatsResponse,
} from "./assets";
export {
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  STATUS_COLORS,
  STATUS_BG,
  STATUS_DOT,
  ASSET_TYPE_LABELS,
} from "./assets";

// ── STAR ADD-ON #2 — Telemetry types ───────────────────────────────────────
export type {
  TelemetryReading,
  CityEventPayload,
  CityHealthPayload,
} from "./telemetry";

// ── STAR ADD-ON #3 — Scenarios ───────────────────────────────────────
export type {
  CausalModifiers,
  ScenarioId,
  ScenarioDefinition,
  CausalHistoryEntry,
  ScenarioStatePayload,
  ScenarioCommandPayload,
} from "./scenarios";
