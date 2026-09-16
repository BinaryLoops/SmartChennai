"use client";

import { useState, useEffect } from "react";
import { Marker, Tooltip } from "react-leaflet";
import type { CameraData } from "./ChennaiMap";
import CCTVModal from "./CCTVModal";
import { createSemanticIcon, StatusColor } from "../map/MapIcons";

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
        const status: StatusColor = isOnline ? "HEALTHY" : "OFFLINE";
        const color = isOnline ? "#22C55E" : "#6B7280";

        return (
          <Marker
            key={cam.id}
            position={[cam.lat, cam.lng]}
            icon={createSemanticIcon("CCTV", status)}
            eventHandlers={{
              click: () => setSelectedCamera(cam),
            }}
          >
            <Tooltip className="cctv-tooltip">
              <div style={{
                background: "#151A24",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "8px",
                padding: "8px 12px",
                color: "#E5E7EB",
                fontSize: "12px",
                lineHeight: "1.5",
              }}>
                <p style={{ fontWeight: 600, marginBottom: "4px" }}>CCTV {cam.id.slice(0, 8)}</p>
                <p>Location: {cam.junctionName}</p>
                <p>Status: <span style={{ color: color, fontWeight: 600 }}>{cam.status.toUpperCase()}</span></p>
              </div>
            </Tooltip>
          </Marker>
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
