"use client";

import { useState, useEffect } from "react";
import { CircleMarker, Tooltip } from "react-leaflet";
import type { CameraData } from "./ChennaiMap";
import CCTVModal from "./CCTVModal";

interface CCTVMarkersProps {
  cameras: CameraData[];
}

export function CCTVMarkers({ cameras }: CCTVMarkersProps) {
  const [selectedCamera, setSelectedCamera] = useState<CameraData | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      {cameras.map((cam) => {
        const isOnline = cam.status === "online";
        return (
          <CircleMarker
            key={cam.id}
            center={[cam.lat, cam.lng]}
            radius={4}
            pathOptions={{
              color: isOnline ? "#22D3EE" : "#5B6272",
              fillColor: isOnline ? "#22D3EE" : "#5B6272",
              fillOpacity: isOnline ? 0.9 : 0.5,
              weight: 1,
            }}
            eventHandlers={{
              click: () => setSelectedCamera(cam),
            }}
          >
            <Tooltip>
              <div style={{
                background: "#151A24",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "8px",
                padding: "6px 10px",
                color: "#E5E7EB",
                fontSize: "11px",
              }}>
                <p style={{ fontWeight: 600 }}>📹 {cam.junctionName}</p>
                <p style={{ color: isOnline ? "#22C55E" : "#EF4444" }}>
                  {isOnline ? "● Online" : "● Offline"}
                </p>
              </div>
            </Tooltip>
          </CircleMarker>
        );
      })}
      {mounted && selectedCamera && (
        <CCTVModal
          camera={selectedCamera}
          onClose={() => setSelectedCamera(null)}
        />
      )}
    </>
  );
}

export default CCTVMarkers;
