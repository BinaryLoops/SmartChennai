"use client";

import { useMap } from "react-leaflet";
import useSWR from "swr";
import { Zap, ZapOff, TriangleAlert } from "lucide-react";
import { createRoot } from "react-dom/client";
import L from "leaflet";
import { useEffect, useState } from "react";
import { useMapFocus } from "../map/MapContext";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function createEnergyIcon(type: string, status: string) {
  const div = document.createElement("div");
  const root = createRoot(div);
  
  let colorClass = "text-yellow-500 bg-yellow-500/10 border-yellow-500/20";
  let pulse = false;
  let Icon = Zap;
  
  if (status === "FAULT" || status === "OFFLINE") {
    colorClass = "text-red-500 bg-red-500/20 border-red-500";
    pulse = true;
    Icon = ZapOff;
  } else if (status === "OVERLOAD_RISK") {
    colorClass = "text-orange-500 bg-orange-500/20 border-orange-500/50";
    pulse = true;
    Icon = TriangleAlert;
  } else if (status === "RECOVERING") {
    colorClass = "text-blue-500 bg-blue-500/10 border-blue-500/20";
    pulse = true;
    Icon = Zap;
  }

  const isSubstation = type === "SUBSTATION";
  const size = isSubstation ? "w-8 h-8" : "w-6 h-6";
  const iconSize = isSubstation ? "w-5 h-5" : "w-4 h-4";
  
  root.render(
    <div className={`flex items-center justify-center rounded-full border ${size} ${colorClass} ${pulse ? "animate-pulse" : ""} shadow-lg backdrop-blur-md`}>
      <Icon className={iconSize} />
    </div>
  );

  return L.divIcon({
    html: div,
    className: "energy-marker-icon",
    iconSize: isSubstation ? [32, 32] : [24, 24],
    iconAnchor: isSubstation ? [16, 16] : [12, 12],
  });
}

export function EnergyMarkers() {
  const { data: energyAssets } = useSWR("/api/energy/assets", fetcher, { refreshInterval: 5000 });
  const map = useMap();
  const [markers, setMarkers] = useState<L.Marker[]>([]);
  const { setFocus } = useMapFocus();

  useEffect(() => {
    if (!energyAssets) return;

    const newMarkers = energyAssets.map((asset: any) => {
      const icon = createEnergyIcon(asset.type, asset.status);
      const marker = L.marker([asset.lat, asset.lng], { icon });

      marker.on("click", () => {
        setFocus({ assetId: asset.id, assetType: "EnergyAsset", lat: asset.lat, lng: asset.lng, zoom: 16 });
      });

      marker.bindTooltip(
        `<div class="font-sans text-sm">
           <div class="font-bold">${asset.type} ${asset.id.slice(0, 8)}</div>
           <div class="${asset.status === "FAULT" ? "text-red-500" : "text-emerald-500"}">${asset.status}</div>
           <div class="text-xs opacity-75 mt-1">Load: ${Math.round(asset.currentLoad)}%</div>
         </div>`,
        { direction: "top", offset: [0, -10], className: "bg-base-card border border-border text-text rounded-md shadow-xl" }
      );

      return marker;
    });

    const group = L.layerGroup(newMarkers);
    group.addTo(map);

    setMarkers(newMarkers);

    return () => {
      group.remove();
    };
  }, [energyAssets, map, setFocus]);

  return null;
}

