"use client";

import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet";

interface MiniMapProps {
  lat: number;
  lng: number;
  name: string;
}

export function MiniMap({ lat, lng, name }: MiniMapProps) {
  return (
    <MapContainer
      center={[lat, lng]}
      zoom={14}
      scrollWheelZoom={false}
      zoomControl={false}
      className="h-full w-full rounded-card"
    >
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
        attribution="Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ"
      />
      <CircleMarker
        center={[lat, lng]}
        radius={8}
        pathOptions={{
          color: "#22D3EE",
          fillColor: "#22D3EE",
          fillOpacity: 0.8,
          weight: 2,
        }}
      >
        <Tooltip direction="top" offset={[0, -8]} permanent>
          <span className="font-semibold">{name}</span>
        </Tooltip>
      </CircleMarker>
    </MapContainer>
  );
}

export default MiniMap;
