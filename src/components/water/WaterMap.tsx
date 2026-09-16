"use client";

import { MapContainer, TileLayer, Marker, Tooltip } from "react-leaflet";
import L from "leaflet";
import { useTranslations } from "next-intl";
import { createSemanticIcon, StatusColor } from "../map/MapIcons";

interface Sensor {
  id: string;
  name: string;
  lat: number;
  lng: number;
  waterLevel: number;
  riskLevel: string;
}

interface Incident {
  id: string;
  type: string;
  lat: number;
  lng: number;
  severity: number;
}

interface MapProps {
  sensors: Sensor[];
  incidents: Incident[];
  selectedSensorId: string | null;
  onSensorClick: (id: string) => void;
}

const incidentIcon = L.divIcon({
  className: "bg-transparent",
  html: `<div class="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center bg-accent-red shadow-[0_0_15px_rgba(239,68,68,0.8)] animate-pulse">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="text-white"><path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/></svg>
         </div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

export function WaterMap({ sensors, incidents, selectedSensorId, onSensorClick }: MapProps) {
  const t = useTranslations("water");

  return (
    <MapContainer
      center={[13.04, 80.24]}
      zoom={11}
      className="h-full w-full rounded-card z-0"
    >
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
        attribution="Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ"
      />

      {/* Render Flood Incidents */}
      {incidents.map((inc) => (
        <Marker key={inc.id} position={[inc.lat, inc.lng]} icon={createSemanticIcon("INCIDENT", "CRITICAL")}>
          <Tooltip>
            <div style={{
              background: "#151A24",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "8px",
              padding: "8px 12px",
              color: "#E5E7EB",
              fontSize: "12px",
              lineHeight: "1.5",
            }}>
              <div className="font-bold text-accent-red uppercase tracking-wider text-xs mb-1">
                {t("floodIncident")}
              </div>
              <div className="text-xs">Severity: {inc.severity}</div>
            </div>
          </Tooltip>
        </Marker>
      ))}

      {/* Render Sensors */}
      {sensors.map((s) => {
        let status: StatusColor = "HEALTHY";
        let color = "#22C55E";
        
        if (s.riskLevel === "danger") {
          status = "CRITICAL";
          color = "#EF4444";
        } else if (s.riskLevel === "warning") {
          status = "WARNING";
          color = "#F59E0B";
        } else if (s.riskLevel === "watch") {
          status = "WARNING";
          color = "#F59E0B";
        }

        return (
          <Marker
            key={s.id}
            position={[s.lat, s.lng]}
            icon={createSemanticIcon("WATER", status)}
            eventHandlers={{
              click: () => onSensorClick(s.id),
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
                lineHeight: "1.5",
              }}>
                <div style={{ fontWeight: 600, marginBottom: "4px" }}>{s.name}</div>
                <div>{t("waterLevel")}: {s.waterLevel} cm</div>
                <div style={{ color, marginTop: "2px", fontWeight: 600 }} className="text-[10px] uppercase tracking-wider">
                  {t(s.riskLevel)}
                </div>
              </div>
            </Tooltip>
          </Marker>
        );
      })}
    </MapContainer>
  );
}

export default WaterMap;
