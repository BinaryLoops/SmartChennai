"use client";

import { MapContainer, TileLayer, Marker, Tooltip } from "react-leaflet";
import { useTranslations } from "next-intl";
import { createSemanticIcon, StatusColor } from "../map/MapIcons";

interface Sensor {
  id: string;
  name: string;
  lat: number;
  lng: number;
  aqi: number;
  status: string;
}

interface MapProps {
  sensors: Sensor[];
  selectedSensorId: string | null;
  onSensorClick: (id: string) => void;
}

export function EnvironmentMap({ sensors, selectedSensorId, onSensorClick }: MapProps) {
  const t = useTranslations("environment");

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

      {/* Render Sensors */}
      {sensors.map((s) => {
        const isSelected = selectedSensorId === s.id;
        
        let color = "#10B981"; // good
        let status: StatusColor = "HEALTHY";
        
        if (s.status === "OFFLINE") {
          color = "#6B7280"; // gray
          status = "OFFLINE";
        } else if (s.aqi > 150) {
          color = "#EF4444"; // hazardous/unhealthy
          status = "CRITICAL";
        } else if (s.aqi > 100) {
          color = "#F59E0B"; // moderate
          status = "WARNING";
        }

        return (
          <Marker
            key={s.id}
            position={[s.lat, s.lng]}
            icon={createSemanticIcon("ENVIRONMENT", status)}
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
                <div>{t("status", { fallback: "Status" })}: <span style={{ color }}>{s.status}</span></div>
                <div>{t("aqi", { fallback: "AQI" })}: {Math.round(s.aqi)}</div>
              </div>
            </Tooltip>
          </Marker>
        );
      })}
    </MapContainer>
  );
}

export default EnvironmentMap;
