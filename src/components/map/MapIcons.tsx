import L from "leaflet";
import { renderToString } from "react-dom/server";
import { TrafficCone, Camera, Droplets, AlertTriangle, Wind, Trash2, Activity, MapPin } from "lucide-react";
import React from "react";

export type IconType = "TRAFFIC" | "CCTV" | "WATER" | "ENVIRONMENT" | "INCIDENT" | "WASTE" | "EMERGENCY" | "DEFAULT";
export type StatusColor = "HEALTHY" | "INFO" | "WARNING" | "CRITICAL" | "OFFLINE";

const colorMap: Record<StatusColor, string> = {
  HEALTHY: "#22C55E", // Green
  INFO: "#06B6D4",    // Cyan/Blue
  WARNING: "#F59E0B", // Amber
  CRITICAL: "#EF4444",// Red
  OFFLINE: "#6B7280"  // Gray
};

const getIconComponent = (type: IconType) => {
  switch (type) {
    case "TRAFFIC": return TrafficCone;
    case "CCTV": return Camera;
    case "WATER": return Droplets;
    case "ENVIRONMENT": return Wind;
    case "INCIDENT": return AlertTriangle;
    case "WASTE": return Trash2;
    case "EMERGENCY": return Activity;
    default: return MapPin;
  }
};

export const createSemanticIcon = (type: IconType, status: StatusColor = "INFO") => {
  const IconCmp = getIconComponent(type);
  const color = colorMap[status];

  const html = renderToString(
    <div style={{
      backgroundColor: "#151A24",
      border: `2px solid ${color}`,
      color: color,
      borderRadius: "50%",
      width: "32px",
      height: "32px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.5)",
      position: "relative"
    }}>
      <IconCmp size={16} />
      {/* Small status indicator dot */}
      <div style={{
        position: "absolute",
        top: "-2px",
        right: "-2px",
        width: "10px",
        height: "10px",
        backgroundColor: color,
        borderRadius: "50%",
        border: "2px solid #151A24"
      }} />
    </div>
  );

  return L.divIcon({
    html,
    className: "semantic-map-icon",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });
};
