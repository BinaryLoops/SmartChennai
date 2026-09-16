"use client";

import { useMemo } from "react";
import { Marker, Tooltip } from "react-leaflet";
import type { TrafficUpdatePayload } from "@packages/types";
import type { JunctionData } from "./ChennaiMap";
import { createSemanticIcon, StatusColor } from "../map/MapIcons";

interface JunctionMarkersProps {
  junctions: JunctionData[];
  trafficByJunction: Map<string, TrafficUpdatePayload>;
}

function congestionStatus(level: number): StatusColor {
  if (level <= 0.35) return "HEALTHY";
  if (level <= 0.65) return "WARNING";
  return "CRITICAL";
}

function statusColor(status: StatusColor): string {
  if (status === "HEALTHY") return "#22C55E";
  if (status === "WARNING") return "#F59E0B";
  return "#EF4444";
}

export function JunctionMarkers({
  junctions,
  trafficByJunction,
}: JunctionMarkersProps) {
  const markers = useMemo(() => {
    return junctions.map((junction) => {
      const live = trafficByJunction.get(junction.id);
      const congestion = live?.congestionLevel ?? junction.congestionLevel;
      const vehiclesPerHour = live?.vehiclesPerHour ?? junction.vehiclesPerHour;
      const avgSpeed = live?.avgSpeedKph ?? junction.avgSpeed;
      const spiked = live?.spiked ?? false;
      const status = spiked ? "CRITICAL" : congestionStatus(congestion);
      const color = statusColor(status);

      return {
        ...junction,
        congestion,
        vehiclesPerHour,
        avgSpeed,
        spiked,
        status,
        color,
      };
    });
  }, [junctions, trafficByJunction]);

  return (
    <>
      {markers.map((m) => (
        <Marker
          key={m.id}
          position={[m.lat, m.lng]}
          icon={createSemanticIcon("TRAFFIC", m.status)}
        >
          <Tooltip className="junction-tooltip">
            <div style={{
              background: "#151A24",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "8px",
              padding: "8px 12px",
              color: "#E5E7EB",
              fontSize: "12px",
              lineHeight: "1.5",
            }}>
              <p style={{ fontWeight: 600, marginBottom: "4px" }}>{m.name}</p>
              <p>Congestion: <span style={{ color: m.color, fontWeight: 600 }}>{Math.round(m.congestion * 100)}%</span></p>
              <p>Speed: {typeof m.avgSpeed === "number" ? m.avgSpeed.toFixed(1) : "—"} km/h</p>
              <p>Volume: {m.vehiclesPerHour} veh/h</p>
              {m.spiked && (
                <p style={{ color: "#EF4444", fontWeight: 600, marginTop: "2px" }}>
                  ⚡ Traffic Spike
                </p>
              )}
            </div>
          </Tooltip>
        </Marker>
      ))}
    </>
  );
}

export default JunctionMarkers;
