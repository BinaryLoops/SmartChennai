"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip, Polyline, Marker } from "react-leaflet";
import L from "leaflet";
import { useTranslations } from "next-intl";

interface MapProps {
  incidents: any[];
  units: any[];
  selectedIncidentId: string | null;
}

const unitIcon = L.divIcon({
  className: "bg-transparent",
  html: `<div class="w-4 h-4 rounded-full border-2 border-white flex items-center justify-center bg-accent-amber shadow-[0_0_10px_rgba(245,158,11,0.5)]"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

export function EmergencyMap({ incidents, units, selectedIncidentId }: MapProps) {
  const t = useTranslations("emergency");
  const [routes, setRoutes] = useState<Record<string, [number, number][]>>({});

  // Fetch OSRM routes for dispatched incidents
  useEffect(() => {
    const fetchRoutes = async () => {
      const newRoutes: Record<string, [number, number][]> = {};

      for (const incident of incidents) {
        if (incident.status === "dispatched" && incident.unitId) {
          const unit = units.find((u) => u.id === incident.unitId);
          if (unit) {
            try {
              // OSRM expects lon,lat
              const res = await fetch(
                `https://router.project-osrm.org/route/v1/driving/${unit.lng},${unit.lat};${incident.lng},${incident.lat}?overview=full&geometries=geojson`
              );
              if (res.ok) {
                const data = await res.json();
                if (data.routes && data.routes.length > 0) {
                  // OSRM returns GeoJSON coordinates as [lng, lat]
                  const coords = data.routes[0].geometry.coordinates.map(
                    (c: [number, number]) => [c[1], c[0]] // Convert to [lat, lng] for Leaflet
                  );
                  newRoutes[incident.id] = coords;
                }
              } else {
                // Fallback to straight line
                newRoutes[incident.id] = [
                  [unit.lat, unit.lng],
                  [incident.lat, incident.lng],
                ];
              }
            } catch (err) {
              console.error("OSRM route fetch failed, using fallback", err);
              newRoutes[incident.id] = [
                [unit.lat, unit.lng],
                [incident.lat, incident.lng],
              ];
            }
          }
        }
      }
      setRoutes(newRoutes);
    };

    fetchRoutes();
  }, [incidents, units]);

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

      {/* Render base stations / units */}
      {units.map((u) => (
        <Marker key={u.id} position={[u.lat, u.lng]} icon={unitIcon}>
          <Tooltip direction="top" offset={[0, -8]}>
            <div className="font-semibold">{u.name}</div>
            <div className="text-xs text-text-muted">
              {u.isAvailable ? t("available") : t("dispatched")}
            </div>
          </Tooltip>
        </Marker>
      ))}

      {/* Render incidents */}
      {incidents.map((inc) => {
        const isSelected = selectedIncidentId === inc.id;
        const color =
          inc.severity >= 4
            ? "#EF4444" // red
            : inc.severity >= 3
            ? "#F59E0B" // amber
            : "#22D3EE"; // cyan

        return (
          <CircleMarker
            key={inc.id}
            center={[inc.lat, inc.lng]}
            radius={isSelected ? 10 : 6}
            pathOptions={{
              color: color,
              fillColor: color,
              fillOpacity: isSelected ? 0.8 : 0.5,
              weight: isSelected ? 3 : 1,
            }}
          >
            <Tooltip>
              <div className="font-semibold">{t(`types.${inc.type}`)}</div>
              <div className="text-xs">Severity: {inc.severity}</div>
            </Tooltip>
          </CircleMarker>
        );
      })}

      {/* Render routes */}
      {Object.entries(routes).map(([incidentId, coords]) => (
        <Polyline
          key={incidentId}
          positions={coords}
          pathOptions={{
            color: "#F59E0B",
            weight: 3,
            dashArray: "5, 10",
            className: "animate-dash", // Custom CSS for marching ants effect
          }}
        />
      ))}
    </MapContainer>
  );
}

export default EmergencyMap;
