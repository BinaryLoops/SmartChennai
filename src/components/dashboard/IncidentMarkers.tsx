"use client";

import { useMemo, memo } from "react";
import { CircleMarker, Tooltip } from "react-leaflet";
import type { IncidentPayload } from "@packages/types";

interface IncidentMarkersProps {
  incidents: IncidentPayload[];
}

const INCIDENT_COLORS: Record<string, string> = {
  fire: "#EF4444",
  traffic: "#F59E0B",
  flood: "#3B82F6",
  medical: "#E5E7EB",
};

const INCIDENT_LABELS: Record<string, string> = {
  fire: "🔥 Fire",
  traffic: "🚗 Traffic Accident",
  flood: "🌊 Flood",
  medical: "🏥 Medical Emergency",
};

export const IncidentMarkers = memo(function IncidentMarkers({ incidents }: IncidentMarkersProps) {
  const activeIncidents = useMemo(
    () => incidents.filter((i) => i.status === "reported"),
    [incidents]
  );

  return (
    <>
      {activeIncidents.map((incident) => {
        const color = INCIDENT_COLORS[incident.type] || "#F59E0B";
        const label = INCIDENT_LABELS[incident.type] || incident.type;

        return (
          <CircleMarker
            key={incident.id}
            center={[incident.lat, incident.lng]}
            radius={10}
            pathOptions={{
              color: color,
              fillColor: color,
              fillOpacity: 0.6,
              weight: 2,
              opacity: 1,
              className: "incident-pulse",
            }}
          >
            <Tooltip>
              <div style={{
                background: "#151A24",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "8px",
                padding: "8px 12px",
                color: "#E5E7EB",
                fontSize: "12px",
                lineHeight: "1.6",
              }}>
                <p style={{ fontWeight: 600, marginBottom: "2px" }}>{label}</p>
                <p>Severity: <span style={{ color, fontWeight: 600 }}>{incident.severity}/5</span></p>
                <p>Source: {incident.source}</p>
                <p style={{ color: "#8B92A5", fontSize: "11px" }}>
                  {new Date(incident.reportedAt).toLocaleTimeString()}
                </p>
              </div>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </>
  );
});

export default IncidentMarkers;
