"use client";

import { useMemo } from "react";
import { Polygon, Tooltip } from "react-leaflet";
import type { TrafficUpdatePayload } from "@packages/types";
import type { ZoneData } from "./ChennaiMap";

interface ZoneLayerProps {
  zones: ZoneData[];
  trafficByJunction: Map<string, TrafficUpdatePayload>;
}

function congestionColor(level: number): string {
  if (level <= 0.35) return "#22C55E"; // green
  if (level <= 0.65) return "#F59E0B"; // amber
  return "#EF4444"; // red
}

function congestionOpacity(level: number): number {
  if (level <= 0.35) return 0.2;
  if (level <= 0.65) return 0.25;
  return 0.3;
}

export function ZoneLayer({ zones, trafficByJunction }: ZoneLayerProps) {
  // Compute per-zone average congestion from junction data
  const zoneCongestion = useMemo(() => {
    const map = new Map<string, { sum: number; count: number }>();
    for (const [, traffic] of trafficByJunction) {
      const entry = map.get(traffic.zoneId) || { sum: 0, count: 0 };
      entry.sum += traffic.congestionLevel;
      entry.count += 1;
      map.set(traffic.zoneId, entry);
    }
    const result = new Map<string, number>();
    for (const [zoneId, { sum, count }] of map) {
      result.set(zoneId, sum / count);
    }
    return result;
  }, [trafficByJunction]);

  return (
    <>
      {zones.map((zone) => {
        const congestion = zoneCongestion.get(zone.id) ?? 0;
        const color = congestionColor(congestion);
        // GeoJSON polygon coordinates are [lng, lat] — Leaflet expects [lat, lng]
        const positions = zone.boundary.coordinates[0].map(
          (coord: number[]) => [coord[1], coord[0]] as [number, number]
        );

        return (
          <Polygon
            key={zone.id}
            positions={positions}
            pathOptions={{
              color: color,
              weight: 1.5,
              fillColor: color,
              fillOpacity: congestionOpacity(congestion),
              opacity: 0.6,
            }}
          >
            <Tooltip
              sticky
              className="zone-tooltip"
            >
              <div className="rounded-lg bg-base-card px-3 py-2 text-sm">
                <p className="font-medium text-text-primary">{zone.name}</p>
                <p className="text-text-secondary">
                  Congestion: {Math.round(congestion * 100)}%
                </p>
              </div>
            </Tooltip>
          </Polygon>
        );
      })}
    </>
  );
}

export default ZoneLayer;
