"use client";

import { MapContainer, TileLayer, CircleMarker, Tooltip, Marker } from "react-leaflet";
import L from "leaflet";
import { useTranslations } from "next-intl";

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
        <Marker key={inc.id} position={[inc.lat, inc.lng]} icon={incidentIcon}>
          <Tooltip>
            <div className="font-bold text-accent-red uppercase tracking-wider text-xs">
              {t("floodIncident")}
            </div>
            <div className="text-xs">Severity: {inc.severity}</div>
          </Tooltip>
        </Marker>
      ))}

      {/* Render Sensors */}
      {sensors.map((s) => {
        const isSelected = selectedSensorId === s.id;
        let color = "#22D3EE"; // normal
        let className = "";
        
        if (s.riskLevel === "danger") {
          color = "#EF4444";
          className = "animate-pulse";
        } else if (s.riskLevel === "warning") {
          color = "#F97316";
        } else if (s.riskLevel === "watch") {
          color = "#F59E0B";
        }

        return (
          <CircleMarker
            key={s.id}
            center={[s.lat, s.lng]}
            radius={isSelected ? 10 : s.riskLevel === "danger" ? 8 : 6}
            eventHandlers={{
              click: () => onSensorClick(s.id),
            }}
            className={className}
            pathOptions={{
              color: color,
              fillColor: color,
              fillOpacity: isSelected ? 0.9 : 0.6,
              weight: isSelected ? 3 : 1,
            }}
          >
            <Tooltip>
              <div className="font-semibold">{s.name}</div>
              <div className="text-xs">{t("waterLevel")}: {s.waterLevel} cm</div>
              <div className="text-[10px] uppercase tracking-wider mt-1" style={{ color }}>
                {t(s.riskLevel)}
              </div>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}

export default WaterMap;
