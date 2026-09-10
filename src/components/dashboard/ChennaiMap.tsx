"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { TrafficUpdatePayload, IncidentPayload } from "@packages/types";

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
const ZoneLayer = dynamic(() => import("./ZoneLayer").then((m) => m.ZoneLayer), {
  ssr: false,
});
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

// Chennai center coordinates
const CHENNAI_CENTER: [number, number] = [13.0827, 80.2707];
const CHENNAI_ZOOM = 12;

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
        <ZoneLayer zones={zones} trafficByJunction={trafficByJunction} />
        <JunctionMarkers
          junctions={junctions}
          trafficByJunction={trafficByJunction}
        />
        <CCTVMarkers cameras={cameras} />
        <IncidentMarkers incidents={incidents} />
      </MapContainer>
    </div>
  );
}

export default ChennaiMap;
