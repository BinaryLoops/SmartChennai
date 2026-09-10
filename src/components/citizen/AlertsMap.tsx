"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { IncidentPayload, WaterUpdatePayload } from "@packages/types";

const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false }
);
const CircleMarker = dynamic(
  () => import("react-leaflet").then((m) => m.CircleMarker),
  { ssr: false }
);
const Tooltip = dynamic(
  () => import("react-leaflet").then((m) => m.Tooltip),
  { ssr: false }
);

const CHENNAI_CENTER: [number, number] = [13.0827, 80.2707];

const INCIDENT_COLORS: Record<string, string> = {
  traffic: "#F59E0B",
  fire: "#EF4444",
  medical: "#3B82F6",
  flood: "#22D3EE",
};

const RISK_COLORS: Record<string, string> = {
  watch: "#F59E0B",
  warning: "#F97316",
  danger: "#EF4444",
};

interface AlertsMapProps {
  incidents: IncidentPayload[];
  floodSensors: WaterUpdatePayload[];
}

export function AlertsMap({ incidents, floodSensors }: AlertsMapProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-64 w-full rounded-xl border border-border bg-base-card">
        <div className="skeleton h-full w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="h-64 w-full overflow-hidden rounded-xl border border-border sm:h-80">
      <MapContainer
        center={CHENNAI_CENTER}
        zoom={11}
        className="h-full w-full"
        zoomControl={false}
        attributionControl={false}
        style={{ background: "#0B0E14" }}
      >
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
          attribution="Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ"
        />

        {/* Incident markers */}
        {incidents.map((inc) => (
          <CircleMarker
            key={inc.id}
            center={[inc.lat, inc.lng]}
            radius={6 + inc.severity}
            pathOptions={{
              color: INCIDENT_COLORS[inc.type] || "#F59E0B",
              fillColor: INCIDENT_COLORS[inc.type] || "#F59E0B",
              fillOpacity: 0.6,
              weight: 2,
            }}
          >
            <Tooltip direction="top" offset={[0, -8]}>
              <span className="text-xs font-medium text-text-primary">
                {inc.type.charAt(0).toUpperCase() + inc.type.slice(1)} — Sev {inc.severity}/5
              </span>
            </Tooltip>
          </CircleMarker>
        ))}

        {/* Flood sensor markers */}
        {floodSensors.map((sensor) => (
          <CircleMarker
            key={sensor.sensorId}
            center={[sensor.lat, sensor.lng]}
            radius={8}
            pathOptions={{
              color: RISK_COLORS[sensor.riskLevel] || "#F59E0B",
              fillColor: RISK_COLORS[sensor.riskLevel] || "#F59E0B",
              fillOpacity: 0.5,
              weight: 2,
              dashArray: "4 4",
            }}
          >
            <Tooltip direction="top" offset={[0, -8]}>
              <span className="text-xs font-medium text-text-primary">
                🌊 {sensor.sensorName} — {sensor.waterLevelCm.toFixed(0)}cm
              </span>
            </Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
