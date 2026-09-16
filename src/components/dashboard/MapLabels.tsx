"use client";

import { useEffect, useState } from "react";
import { useMap, Marker } from "react-leaflet";
import L from "leaflet";
import type { ZoneData, JunctionData } from "./ChennaiMap";

interface MapLabelsProps {
  zones: ZoneData[];
  junctions: JunctionData[];
}

export function MapLabels({ zones, junctions }: MapLabelsProps) {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());

  useEffect(() => {
    const onZoom = () => setZoom(map.getZoom());
    map.on("zoomend", onZoom);
    return () => {
      map.off("zoomend", onZoom);
    };
  }, [map]);

  // Zoom < 13: Show only major zones
  // Zoom 13-14: Show zones + major junctions
  // Zoom >= 15: Show detailed junction/asset IDs, hide zones

  const createTextIcon = (text: string, size: "large" | "medium" | "small") => {
    const classNames = {
      large: "text-lg font-bold text-white/90 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] uppercase tracking-widest",
      medium: "text-sm font-semibold text-white/80 drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]",
      small: "text-[10px] font-mono text-white/60 drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]",
    };

    return L.divIcon({
      className: "bg-transparent border-0",
      html: `<div class="whitespace-nowrap ${classNames[size]}">${text}</div>`,
      iconSize: [100, 20],
      iconAnchor: [50, 10], // Center the text
    });
  };

  return (
    <>
      {/* Zone Labels */}
      {zoom < 15 && zones.map(zone => {
        // Calculate rough center from boundary for the label
        // We just average the boundary points as a quick heuristic
        const coords = zone.boundary.coordinates[0];
        const lat = coords.reduce((acc, c) => acc + c[1], 0) / coords.length;
        const lng = coords.reduce((acc, c) => acc + c[0], 0) / coords.length;

        return (
          <Marker 
            key={`zone-${zone.id}`}
            position={[lat, lng]}
            icon={createTextIcon(zone.name, zoom < 13 ? "large" : "medium")}
            interactive={false}
          />
        );
      })}

      {/* Junction Labels (Asset IDs or Names) */}
      {zoom >= 13 && junctions.map((junction, index) => {
        // If high zoom (street level >= 15), show Asset ID
        // If medium zoom (13-14), show Junction Name
        const text = zoom >= 15 ? junction.id.slice(0, 8) : junction.name;
        const size = zoom >= 15 ? "small" : "medium";
        
        // Downsample junctions at medium zoom to avoid clutter deterministically
        if (zoom < 15 && index % 3 !== 0) return null;

        return (
          <Marker
            key={`junc-lbl-${junction.id}`}
            position={[junction.lat, junction.lng]}
            icon={createTextIcon(text, size)}
            interactive={false}
          />
        );
      })}
    </>
  );
}
