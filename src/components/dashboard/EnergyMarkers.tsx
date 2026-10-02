"use client";

import { useMap } from "react-leaflet";
import useSWR from "swr";
import { Zap, ZapOff, TriangleAlert } from "lucide-react";
import L from "leaflet";
import { useEffect, useState, useMemo } from "react";
import React from "react";
import { useMapFocus } from "../map/MapContext";
import MarkerClusterGroup from "react-leaflet-cluster";
import { Marker, Tooltip } from "react-leaflet";
import { renderToString } from "react-dom/server";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function getEnergyIconHtml(type: string, status: string) {
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

  return renderToString(
    <div className={`flex items-center justify-center rounded-full border ${size} ${colorClass} ${pulse ? "animate-pulse" : ""} shadow-lg backdrop-blur-md`}>
      <Icon className={iconSize} />
    </div>
  );
}

// Cache icons to avoid recreating them for every marker
const iconCache = new Map<string, L.DivIcon>();

function getEnergyIcon(type: string, status: string) {
  const key = `${type}-${status}`;
  if (iconCache.has(key)) return iconCache.get(key)!;

  const isSubstation = type === "SUBSTATION";
  const html = getEnergyIconHtml(type, status);
  
  const icon = L.divIcon({
    html,
    className: "energy-marker-icon",
    iconSize: isSubstation ? [32, 32] : [24, 24],
    iconAnchor: isSubstation ? [16, 16] : [12, 12],
  });

  iconCache.set(key, icon);
  return icon;
}

export function EnergyMarkers() {
  const { data: energyAssets } = useSWR("/api/energy/assets", fetcher, { refreshInterval: 5000 });
  const { setFocus } = useMapFocus();

  if (!Array.isArray(energyAssets)) return null;

  return (
    <MarkerClusterGroup
      chunkedLoading
      maxClusterRadius={50}
      disableClusteringAtZoom={15}
    >
      {energyAssets.map((asset: any) => {
        const icon = getEnergyIcon(asset.type, asset.status);
        
        return (
          <Marker
            key={asset.id}
            position={[asset.lat, asset.lng]}
            icon={icon}
            eventHandlers={{
              click: () => {
                setFocus({ assetId: asset.id, assetType: "EnergyAsset", lat: asset.lat, lng: asset.lng, zoom: 16 });
              }
            }}
          >
            <Tooltip direction="top" offset={[0, -10]} className="bg-base-card border border-border text-text rounded-md shadow-xl">
              <div className="font-sans text-sm p-1">
                <div className="font-bold">{asset.type} {asset.id.slice(0, 8)}</div>
                <div className={asset.status === "FAULT" ? "text-red-500" : "text-emerald-500"}>{asset.status}</div>
                <div className="text-xs opacity-75 mt-1">Load: {Math.round(asset.currentLoad)}%</div>
              </div>
            </Tooltip>
          </Marker>
        );
      })}
    </MarkerClusterGroup>
  );
}

export default React.memo(EnergyMarkers);
