"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { ContinuousAIPlayer } from "./ContinuousAIPlayer";
import { CCTVFullscreenModal } from "./CCTVFullscreenModal";
import type { TrafficUpdatePayload, IncidentPayload } from "@packages/types";

interface CameraData {
  id: string;
  junctionId: string;
  junctionName: string;
  zoneName?: string;
  lat: number;
  lng: number;
  status: string;
}

interface Zone {
  id: string;
  name: string;
}

interface CCTVGridProps {
  cameras: CameraData[];
  zones: Zone[];
  trafficByJunction: Map<string, TrafficUpdatePayload>;
  incidents: IncidentPayload[];
  filterZone: string;
  onFilterZoneChange: (zone: string) => void;
}

export function CCTVGrid({
  cameras,
  zones,
  trafficByJunction,
  incidents,
  filterZone,
  onFilterZoneChange,
}: CCTVGridProps) {
  const t = useTranslations("cctv");
  const [statusFilter, setStatusFilter] = useState<"all" | "online" | "offline">("all");
  const [selectedCamera, setSelectedCamera] = useState<CameraData | null>(null);

  // Build zone map for cameras
  const zoneMap = useMemo(() => new Map(zones.map((z) => [z.id, z.name])), [zones]);

  // Build junction->zone mapping from traffic data
  const junctionZoneMap = useMemo(() => {
    const map = new Map<string, string>();
    // We infer zoneId from cameras' junction data that was loaded from the API
    return map;
  }, []);

  const filteredCameras = useMemo(() => {
    let result = cameras;

    if (filterZone !== "all") {
      result = result.filter((c) => {
        // Match cameras whose junction is in the filtered zone
        const traffic = trafficByJunction.get(c.junctionId);
        if (traffic) return traffic.zoneId === filterZone;
        return true; // Show if no traffic data
      });
    }

    if (statusFilter !== "all") {
      result = result.filter((c) => c.status === statusFilter);
    }

    return result;
  }, [cameras, filterZone, statusFilter, trafficByJunction]);

  // Find incident for a given junction (by proximity)
  const getIncidentForJunction = (junctionId: string): IncidentPayload | null => {
    const traffic = trafficByJunction.get(junctionId);
    if (!traffic) return null;

    return (
      incidents.find((inc) => {
        if (inc.status !== "reported") return false;
        const dist = Math.sqrt(
          Math.pow(inc.lat - traffic.lat, 2) + Math.pow(inc.lng - traffic.lng, 2)
        );
        return dist < 0.01; // ~1km
      }) ?? null
    );
  };

  const onlineCount = cameras.filter((c) => c.status === "online").length;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-accent-cyan/20 text-accent-cyan text-xs">📹</div>
          <span className="text-sm font-medium text-text-primary">
            {onlineCount}/{cameras.length} {t("online")}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | "online" | "offline")}
            className="rounded-lg border border-border bg-base px-3 py-1.5 text-xs text-text-primary focus:border-accent-cyan focus:outline-none"
          >
            <option value="all">{t("filterAll")}</option>
            <option value="online">{t("filterOnline")}</option>
            <option value="offline">{t("offline")}</option>
          </select>
        </div>
      </div>

      {/* Camera Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {filteredCameras.map((cam, i) => {
          const traffic = trafficByJunction.get(cam.junctionId);
          const incident = getIncidentForJunction(cam.junctionId);
          const congPercent = traffic ? Math.round(traffic.congestionLevel * 100) : 0;

          return (
            <motion.div
              key={cam.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="group rounded-xl border border-border bg-base-card overflow-hidden shadow-lg hover:border-accent-cyan/30 transition-colors"
            >
              {/* Camera Feed */}
              <ContinuousAIPlayer
                cameraId={cam.id}
                junctionName={cam.junctionName}
                zoneName={cam.zoneName || ""}
                vehiclesPerHour={traffic?.vehiclesPerHour ?? 0}
                congestionLevel={traffic?.congestionLevel ?? 0}
                avgSpeed={traffic?.avgSpeedKph ?? 0}
                incident={incident ? { type: incident.type, severity: incident.severity } : null}
                className="aspect-video w-full"
                onClick={() => setSelectedCamera(cam)}
                enabled={cam.status === "online" && ["CAM-KTP-01", "CAM-TYN-03", "CAM-MAR-02", "CAM-AMB-04"].includes(cam.id)}
              />

              {/* Camera Info Bar */}
              <div className="flex items-center justify-between px-3 py-2 border-t border-border">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${cam.status === "online" ? "bg-green-500" : "bg-red-500"}`} />
                  <span className="text-xs font-medium text-text-primary truncate max-w-[120px]">
                    {cam.junctionName}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {traffic && (
                    <span className={`text-[10px] font-mono font-bold ${congPercent > 80 ? "text-accent-red" : congPercent > 60 ? "text-accent-amber" : "text-accent-green"}`}>
                      {congPercent}%
                    </span>
                  )}
                  <button
                    onClick={() => setSelectedCamera(cam)}
                    className="text-[10px] text-text-muted hover:text-accent-cyan transition-colors"
                  >
                    {t("fullscreen")}
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {filteredCameras.length === 0 && (
        <div className="flex items-center justify-center py-12 text-text-muted text-sm">
          {t("cameraOffline")}
        </div>
      )}

      {/* Fullscreen Modal */}
      {selectedCamera && (
        <CCTVFullscreenModal
          camera={{
            ...selectedCamera,
            zoneName: selectedCamera.zoneName || "",
          }}
          traffic={
            trafficByJunction.get(selectedCamera.junctionId)
              ? {
                  vehiclesPerHour: trafficByJunction.get(selectedCamera.junctionId)!.vehiclesPerHour,
                  congestionLevel: trafficByJunction.get(selectedCamera.junctionId)!.congestionLevel,
                  avgSpeedKph: trafficByJunction.get(selectedCamera.junctionId)!.avgSpeedKph,
                }
              : null
          }
          incident={(() => {
            const inc = getIncidentForJunction(selectedCamera.junctionId);
            return inc ? { type: inc.type, severity: inc.severity, status: inc.status } : null;
          })()}
          onClose={() => setSelectedCamera(null)}
        />
      )}
    </div>
  );
}

export default CCTVGrid;
