"use client";

import React from "react";
import { Marker, Popup, Polyline } from "react-leaflet";
import useSWR from "swr";
import L from "leaflet";

const woIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  className: "hue-rotate-[240deg]" // Blue-ish
});

const projIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [35, 55],
  iconAnchor: [17, 55],
  popupAnchor: [1, -34],
  className: "hue-rotate-[45deg]" // Yellow-ish
});

const crewIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  className: "hue-rotate-[120deg]" // Green-ish
});

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function PublicWorksOverlay() {
  const { data: workOrders = [] } = useSWR("/api/public-works/work-orders", fetcher, { refreshInterval: 3000 });
  const { data: projects = [] } = useSWR("/api/public-works/projects", fetcher, { refreshInterval: 3000 });
  const { data: crews = [] } = useSWR("/api/public-works/crews", fetcher, { refreshInterval: 3000 });

  return (
    <>
      {projects.map((proj: any) => (
        <Marker key={proj.id} position={[proj.lat, proj.lng]} icon={projIcon}>
          <Popup>
            <div className="text-xs">
              <strong className="block text-sm mb-1">🏗️ {proj.name}</strong>
              <div>Progress: {proj.progressPercent.toFixed(1)}%</div>
              <div>Status: {proj.status}</div>
              <div>Dept: {proj.department}</div>
            </div>
          </Popup>
        </Marker>
      ))}

      {workOrders.filter((wo: any) => wo.CityAsset && wo.status !== 'COMPLETED' && wo.status !== 'CANCELLED').map((wo: any) => (
        <Marker key={wo.id} position={[wo.CityAsset.lat, wo.CityAsset.lng]} icon={woIcon}>
          <Popup>
            <div className="text-xs">
              <strong className="block text-sm mb-1">🔧 {wo.workOrderCode}</strong>
              <div>Priority: {wo.priority}</div>
              <div>Status: {wo.status}</div>
              <div>Category: {wo.category}</div>
              {wo.Crew && <div>Assigned: {wo.Crew.crewCode}</div>}
            </div>
          </Popup>
        </Marker>
      ))}

      {crews.map((crew: any) => (
        <Marker key={crew.id} position={[crew.lat, crew.lng]} icon={crewIcon}>
          <Popup>
            <div className="text-xs">
              <strong className="block text-sm mb-1">🚚 {crew.crewCode}</strong>
              <div>Status: {crew.status}</div>
              <div>Spec: {crew.specialization}</div>
            </div>
          </Popup>
        </Marker>
      ))}
      
      {/* Draw lines from crews to their assigned work orders */}
      {crews.filter((c: any) => c.status === 'EN_ROUTE' && c.currentWorkOrderId).map((crew: any) => {
        const wo = workOrders.find((w: any) => w.id === crew.currentWorkOrderId);
        if (wo && wo.CityAsset) {
          return (
            <Polyline
              key={"line-" + crew.id}
              positions={[[crew.lat, crew.lng], [wo.CityAsset.lat, wo.CityAsset.lng]]}
              color="blue"
              dashArray="5, 10"
              weight={2}
            />
          );
        }
        return null;
      })}
    </>
  );
}
