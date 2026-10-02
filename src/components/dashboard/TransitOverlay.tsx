"use client";

import { useMap } from "react-leaflet";
import useSWR from "swr";
import { Bus } from "lucide-react";
import { createRoot } from "react-dom/client";
import L from "leaflet";
import { useEffect } from "react";
import { useMapFocus } from "../map/MapContext";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function createTransitIcon(status: string, delay: number, occupancy: number, capacity: number) {
  const div = document.createElement("div");
  const root = createRoot(div);
  
  let colorClass = "text-blue-500 bg-blue-500/10 border-blue-500/20";
  let pulse = false;
  
  if (status === "DELAYED" || delay > 10) {
    colorClass = "text-orange-500 bg-orange-500/20 border-orange-500/50";
    pulse = true;
  } else if (occupancy > capacity) {
    colorClass = "text-red-500 bg-red-500/20 border-red-500";
    pulse = true;
  } else if (status === "OFFLINE" || status === "OUT_OF_SERVICE") {
    colorClass = "text-gray-500 bg-gray-500/10 border-gray-500/20";
  }

  root.render(
    <div className={`relative flex items-center justify-center rounded-full border ${colorClass} backdrop-blur-md shadow-lg w-7 h-7`}>
      <Bus className="w-4 h-4" />
      {pulse && (
        <div className="absolute inset-0 rounded-full animate-ping opacity-50 bg-current"></div>
      )}
      {delay > 5 && (
        <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold px-1 rounded shadow">
          +{delay}
        </div>
      )}
    </div>
  );

  return L.divIcon({
    html: div,
    className: "",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function createStopIcon() {
  const div = document.createElement("div");
  div.className = "w-2 h-2 rounded-full bg-white border border-blue-500 shadow";
  return L.divIcon({ html: div, className: "", iconSize: [8, 8], iconAnchor: [4, 4] });
}

export function TransitOverlay() {
  const map = useMap();
  const { setFocus } = useMapFocus();
  
  const { data } = useSWR("/api/transit/routes", fetcher, {
    refreshInterval: 3000,
  });

  useEffect(() => {
    if (!data?.routes || !Array.isArray(data.routes)) return;

    const group = L.layerGroup().addTo(map);

    data.routes.forEach((route: any) => {
      try {
        const polyline = JSON.parse(route.polyline || "[]");
        if (polyline.length > 0) {
          L.polyline(polyline, {
            color: "#3b82f6",
            weight: 3,
            opacity: 0.6,
            dashArray: "5, 5"
          }).addTo(group);
        }
      } catch (e) {}

      route.stops?.forEach((rs: any) => {
        const stop = rs.stop;
        if (stop) {
           const marker = L.marker([stop.lat, stop.lng], { icon: createStopIcon() });
           marker.bindTooltip(`
            <div class="font-sans">
              <div class="font-bold">${stop.name}</div>
              <div class="text-xs text-gray-500">Wait: ${stop.currentWaitingPassengers} pax</div>
            </div>
           `, { className: "bg-white border-0 shadow-lg rounded p-2" });
           
           // I need the actual CityAsset ID to use AssetDetailsPanel properly.
           // Or I can just pass refId and handle it.
           marker.addTo(group);
        }
      });

      route.vehicles?.forEach((v: any) => {
        if (!v.lat || !v.lng) return;
        
        const icon = createTransitIcon(v.status, v.delayMinutes, v.occupancy, 60); // mock capacity 60
        const marker = L.marker([v.lat, v.lng], { icon });

        // Needs the CityAsset ID. For now we use the transit vehicle ID, but in AssetDetailsPanel we need to look it up.
        // Actually, setFocus requires an assetId (CityAsset.id).
        // If we don't have CityAsset ID here, we can't open details easily unless we fetch it.
        // Let's just bind a tooltip for now.
        marker.bindTooltip(`
          <div class="font-sans">
            <div class="font-bold text-blue-600">${v.vehicleCode}</div>
            <div class="text-xs">Speed: ${Math.round(v.speed)} km/h</div>
            <div class="text-xs">Pax: ${v.occupancy}/60</div>
            ${v.delayMinutes > 0 ? `<div class="text-xs text-red-500">Delay: +${v.delayMinutes}m</div>` : ""}
          </div>
        `, { className: "bg-white border-0 shadow-lg rounded p-2" });

        marker.addTo(group);
      });
    });

    return () => {
      group.remove();
    };
  }, [data, map, setFocus]);

  return null;
}
