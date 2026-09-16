export interface TelemetryReading {
  id: string;
  assetId: string;
  metric: string;
  value: number;
  unit: string;
  timestamp: string;
  quality: "LIVE" | "RECENT" | "STALE" | "OFFLINE";
  source: string;
  metadata?: Record<string, any>;
}

export interface CityEventPayload {
  id: string;
  type: string;
  severity: "NORMAL" | "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  description: string;
  assetId?: string;
  zoneId?: string;
  zoneName?: string;
  source: string;
  status: string;
  confidence?: number;
  metadata?: Record<string, any>;
  relatedIncidentId?: string;
  timestamp: string;
}

export interface CityHealthPayload {
  overallScore: number;
  components: {
    traffic: number;
    water: number;
    cctv: number;
    emergency: number;
    environment: number;
    waste: number;
    energy: number;
  };
  timestamp: string;
}
