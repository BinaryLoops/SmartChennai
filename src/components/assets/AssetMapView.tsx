"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { CityAssetRow, AssetStatus, AssetCategory } from "@packages/types/assets";
import { CATEGORY_ICONS, STATUS_DOT } from "@packages/types/assets";
import clsx from "clsx";

// Leaflet must be dynamically imported (SSR-incompatible)
const MapContainer = dynamic(() => import("react-leaflet").then(m => m.MapContainer), { ssr: false });
const TileLayer    = dynamic(() => import("react-leaflet").then(m => m.TileLayer),    { ssr: false });
const CircleMarker = dynamic(() => import("react-leaflet").then(m => m.CircleMarker), { ssr: false });
const Tooltip      = dynamic(() => import("react-leaflet").then(m => m.Tooltip),      { ssr: false });
const Popup        = dynamic(() => import("react-leaflet").then(m => m.Popup),        { ssr: false });

// Chennai center
const CHENNAI_CENTER: [number, number] = [13.0827, 80.2707];
const CHENNAI_ZOOM = 11;

const STATUS_FILL: Record<AssetStatus, string> = {
  HEALTHY:     "#22C55E",
  DEGRADED:    "#F59E0B",
  OFFLINE:     "#EF4444",
  MAINTENANCE: "#60A5FA",
  UNKNOWN:     "#6B7280",
};

interface AssetMapViewProps {
  assets: CityAssetRow[];
  selectedId?: string | null;
  onSelectAsset: (asset: CityAssetRow) => void;
}

export function AssetMapView({ assets, selectedId, onSelectAsset }: AssetMapViewProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted) {
    return <div className="h-full w-full skeleton rounded-xl" />;
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl border border-border">
      <MapContainer
        center={CHENNAI_CENTER}
        zoom={CHENNAI_ZOOM}
        className="h-full w-full"
        zoomControl={false}
        attributionControl={false}
        style={{ background: "#0B0E14" }}
      >
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
          attribution=""
        />

        {assets.map(asset => {
          const isSelected = asset.id === selectedId;
          const fillColor = STATUS_FILL[asset.status] ?? "#6B7280";
          const radius = isSelected ? 11 : asset.status === "OFFLINE" ? 5 : 6;

          return (
            <CircleMarker
              key={asset.id}
              center={[asset.lat, asset.lng]}
              radius={radius}
              fillColor={fillColor}
              color={isSelected ? "#22D3EE" : fillColor}
              fillOpacity={isSelected ? 0.95 : 0.75}
              weight={isSelected ? 3 : 1.5}
              eventHandlers={{ click: () => onSelectAsset(asset) }}
            >
              <Tooltip direction="top" offset={[0, -8]} opacity={1} permanent={false}>
                <div className="rounded-lg bg-base-card border border-border p-2 text-xs shadow-xl min-w-[140px]">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span>{CATEGORY_ICONS[asset.category]}</span>
                    <span className="font-mono font-bold text-accent-cyan text-[10px]">{asset.assetCode}</span>
                  </div>
                  <p className="font-medium text-text-primary line-clamp-1">{asset.name}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span
                      className="inline-block h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: fillColor }}
                    />
                    <span className="text-text-muted">{asset.status}</span>
                    <span className="ml-auto text-text-muted">{asset.healthScore}%</span>
                  </div>
                </div>
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {/* Map legend */}
      <div className="absolute bottom-3 left-3 z-[400] rounded-lg bg-base-card/90 border border-border backdrop-blur-sm p-2.5 space-y-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-2">Legend</p>
        {(["HEALTHY", "DEGRADED", "OFFLINE", "MAINTENANCE"] as AssetStatus[]).map(s => (
          <div key={s} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_FILL[s] }} />
            <span className="text-[10px] text-text-secondary capitalize">{s.toLowerCase()}</span>
          </div>
        ))}
      </div>

      {/* Asset count badge */}
      <div className="absolute top-3 right-3 z-[400] rounded-lg bg-base-card/90 border border-border backdrop-blur-sm px-3 py-1.5">
        <span className="text-xs font-semibold text-text-primary">{assets.length} assets shown</span>
      </div>
    </div>
  );
}
