/**
 * STAR ADD-ON #1 — Shared Asset Registry Types
 *
 * Consumed by API routes, UI components, and future simulation modules.
 */

export type AssetCategory =
  | "MOBILITY"
  | "WATER"
  | "SAFETY"
  | "HEALTHCARE"
  | "ENVIRONMENT"
  | "WASTE"
  | "ENERGY"
  | "PUBLIC_FACILITIES"
  | "PROJECTS";

export type AssetStatus =
  | "HEALTHY"
  | "DEGRADED"
  | "OFFLINE"
  | "MAINTENANCE"
  | "UNKNOWN";

/** Lightweight row returned by GET /api/assets (list view) */
export interface CityAssetRow {
  id: string;
  assetCode: string;
  name: string;
  assetType: string;
  category: AssetCategory;
  lat: number;
  lng: number;
  zoneId: string | null;
  zoneName: string | null;
  ward: string | null;
  status: AssetStatus;
  healthScore: number;
  refType: string | null;
  refId: string | null;
  isDemo: boolean;
  lastSeenAt: string | null;
  updatedAt: string;
  metadata: Record<string, any> | null;
}

/** Full detail returned by GET /api/assets/:id */
export interface CityAssetDetail extends CityAssetRow {
  /** Live operational data resolved from the domain entity, if linked */
  liveData: Record<string, any> | null;
  relatedIncidents: {
    id: string;
    type: string;
    severity: number;
    status: string;
    reportedAt: string;
    description: string | null;
  }[];
}

/** Response shape from GET /api/assets */
export interface AssetListResponse {
  assets: CityAssetRow[];
  total: number;
  page: number;
  pages: number;
}

/** Response shape from GET /api/assets/stats */
export interface AssetStatsResponse {
  total: number;
  healthy: number;
  degraded: number;
  offline: number;
  maintenance: number;
  unknown: number;
  byCategory: { category: AssetCategory; count: number }[];
  byZone: { zoneId: string | null; zoneName: string; count: number }[];
}

// ── Display helpers ────────────────────────────────────────────────────────

export const CATEGORY_LABELS: Record<AssetCategory, string> = {
  MOBILITY:          "Mobility",
  WATER:             "Water",
  SAFETY:            "Safety",
  HEALTHCARE:        "Healthcare",
  ENVIRONMENT:       "Environment",
  WASTE:             "Waste",
  ENERGY:            "Energy",
  PUBLIC_FACILITIES: "Public Facilities",
  PROJECTS:          "Projects",
};

export const CATEGORY_ICONS: Record<AssetCategory, string> = {
  MOBILITY:          "🚦",
  WATER:             "💧",
  SAFETY:            "🛡️",
  HEALTHCARE:        "🏥",
  ENVIRONMENT:       "🌿",
  WASTE:             "🗑️",
  ENERGY:            "⚡",
  PUBLIC_FACILITIES: "🏛️",
  PROJECTS:          "🔧",
};

export const STATUS_COLORS: Record<AssetStatus, string> = {
  HEALTHY:     "text-accent-green",
  DEGRADED:    "text-accent-amber",
  OFFLINE:     "text-accent-red",
  MAINTENANCE: "text-blue-400",
  UNKNOWN:     "text-text-muted",
};

export const STATUS_BG: Record<AssetStatus, string> = {
  HEALTHY:     "bg-accent-green/10 border-accent-green/30",
  DEGRADED:    "bg-accent-amber/10 border-accent-amber/30",
  OFFLINE:     "bg-accent-red/10 border-accent-red/30",
  MAINTENANCE: "bg-blue-400/10 border-blue-400/30",
  UNKNOWN:     "bg-text-muted/10 border-text-muted/30",
};

export const STATUS_DOT: Record<AssetStatus, string> = {
  HEALTHY:     "bg-accent-green",
  DEGRADED:    "bg-accent-amber",
  OFFLINE:     "bg-accent-red",
  MAINTENANCE: "bg-blue-400",
  UNKNOWN:     "bg-text-muted",
};

export const ASSET_TYPE_LABELS: Record<string, string> = {
  cctv_camera:     "CCTV Camera",
  water_sensor:    "Water Sensor",
  junction:        "Traffic Junction",
  ambulance:       "Ambulance",
  fire_truck:      "Fire Truck",
  env_sensor:      "AQI Sensor",
  garbage_bin:     "Waste Bin",
  street_light:    "Street Light",
  bus:             "Public Bus",
  bus_stop:        "Bus Stop",
  hospital:        "Hospital",
  police_station:  "Police Station",
  fire_station:    "Fire Station",
  school:          "School",
  park:            "Park",
  shelter:         "Emergency Shelter",
  road_project:    "Road Project",
};
