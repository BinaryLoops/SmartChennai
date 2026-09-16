"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { TrafficUpdatePayload, IncidentPayload } from "@packages/types";
import { LayersControl } from "react-leaflet";
import { MapFocusController } from "../map/MapFocusController";
import { AssetDetailsPanel } from "../map/AssetDetailsPanel";

// Dynamic import for Leaflet (SSR-incompatible)
const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false }
);

// Sub-layers loaded dynamically to avoid SSR issues
const MapLabels = dynamic(
  () => import("./MapLabels").then((m) => m.MapLabels),
  { ssr: false }
);
const JunctionMarkers = dynamic(
  () => import("./JunctionMarkers").then((m) => m.JunctionMarkers),
  { ssr: false }
);
const CCTVMarkers = dynamic(
  () => import("./CCTVMarkers").then((m) => m.CCTVMarkers),
  { ssr: false }
);
const IncidentMarkers = dynamic(
  () => import("./IncidentMarkers").then((m) => m.IncidentMarkers),
  { ssr: false }
);
const WasteMarkers = dynamic(
  () => import("./WasteMarkers").then((m) => m.WasteMarkers),
  { ssr: false }
);
const EnergyMarkers = dynamic(
  () => import("./EnergyMarkers").then((m) => m.EnergyMarkers),
  { ssr: false }
);

export interface ZoneData {
  id: string;
  name: string;
  boundary: { type: string; coordinates: number[][][] };
  population: number;
}

export interface JunctionData {
  id: string;
  name: string;
  zoneId: string;
  lat: number;
  lng: number;
  congestionLevel: number;
  vehiclesPerHour: number;
  avgSpeed: number;
}

export interface CameraData {
  id: string;
  junctionId: string;
  junctionName: string;
  lat: number;
  lng: number;
  status: string;
}

interface ChennaiMapProps {
  zones: ZoneData[];
  junctions: JunctionData[];
  cameras: CameraData[];
  incidents: IncidentPayload[];
  trafficByJunction: Map<string, TrafficUpdatePayload>;
}

// Chennai center coordinates (approximate middle of seeded zones)
const CHENNAI_CENTER: [number, number] = [13.0, 80.22];
const CHENNAI_ZOOM = 11;

export function ChennaiMap({
  zones,
  junctions,
  cameras,
  incidents,
  trafficByJunction,
}: ChennaiMapProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-card border border-border bg-base-card text-text-muted">
        <div className="skeleton h-full w-full" />
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-card border border-border">
      <AssetDetailsPanel />
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
          attribution="Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ"
        />
        <MapFocusController />
        <MapLabels zones={zones} junctions={junctions} />
        <LayersControl position="topright">
          <LayersControl.Overlay name="Traffic Signals" checked>
            <div>
              <JunctionMarkers
                junctions={junctions}
                trafficByJunction={trafficByJunction}
              />
            </div>
          </LayersControl.Overlay>
          
          <LayersControl.Overlay name="Incidents" checked>
            <div>
              <IncidentMarkers incidents={incidents} />
            </div>
          </LayersControl.Overlay>
          
          <LayersControl.Overlay name="CCTV Cameras" checked>
            <div>
              <CCTVMarkers cameras={cameras} />
            </div>
          </LayersControl.Overlay>
          
          <LayersControl.Overlay name="Waste Operations" checked>
            <div>
              <WasteMarkers />
            </div>
          </LayersControl.Overlay>
          
          <LayersControl.Overlay name="Energy Infrastructure" checked>
            <div>
              <EnergyMarkers />
            </div>
          </LayersControl.Overlay>
        </LayersControl>
      </MapContainer>
    </div>
  );
}

export default ChennaiMap;
