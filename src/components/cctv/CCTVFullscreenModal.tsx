"use client";

import { useEffect, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { ContinuousAIPlayer } from "./ContinuousAIPlayer";

interface CameraInfo {
  id: string;
  junctionId: string;
  junctionName: string;
  zoneName: string;
  lat: number;
  lng: number;
  status: string;
}

interface TrafficLive {
  vehiclesPerHour: number;
  congestionLevel: number;
  avgSpeedKph: number;
}

interface IncidentInfo {
  type: string;
  severity: number;
  status: string;
}

interface CCTVFullscreenModalProps {
  camera: CameraInfo;
  traffic: TrafficLive | null;
  incident: IncidentInfo | null;
  onClose: () => void;
}

export function CCTVFullscreenModal({
  camera,
  traffic,
  incident,
  onClose,
}: CCTVFullscreenModalProps) {
  const t = useTranslations("cctv");
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const congPercent = traffic ? Math.round(traffic.congestionLevel * 100) : 0;
  let statusColor = "text-accent-green";
  let statusText = "Normal";
  if (congPercent > 80) { statusColor = "text-accent-red"; statusText = "Critical"; }
  else if (congPercent > 60) { statusColor = "text-accent-amber"; statusText = "Warning"; }

  if (!mounted) return null;

  const modal = (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          className="relative z-10 w-full max-w-5xl rounded-xl border border-border bg-base-elevated shadow-2xl overflow-hidden"
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.92, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-6 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-base-card text-sm">📹</div>
              <div>
                <h3 className="text-sm font-semibold text-text-primary">{camera.junctionName}</h3>
                <p className="text-xs text-text-muted">{camera.zoneName} · CAM {camera.id.slice(0, 8).toUpperCase()}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-base-card hover:text-text-primary"
              aria-label={t("close")}
            >
              ✕
            </button>
          </div>

          {/* Content */}
          <div className="flex flex-col lg:flex-row">
            {/* Camera Feed */}
            <div className="flex-1 p-4">
              <ContinuousAIPlayer
                cameraId={camera.id}
                junctionName={camera.junctionName}
                zoneName={camera.zoneName}
                vehiclesPerHour={traffic?.vehiclesPerHour ?? 0}
                congestionLevel={traffic?.congestionLevel ?? 0}
                avgSpeed={traffic?.avgSpeedKph ?? 0}
                incident={incident}
                className="aspect-video w-full"
                enabled={camera.status === "online"}
              />
            </div>

            {/* Side Panel */}
            <div className="w-full lg:w-72 border-t lg:border-t-0 lg:border-l border-border p-4 space-y-4">
              {/* CCTV Info */}
              <div>
                <h4 className="text-[10px] uppercase tracking-widest text-text-muted mb-2">{t("camera")}</h4>
                <div className="space-y-2">
                  <InfoRow label="ID" value={`CAM ${camera.id.slice(0, 8).toUpperCase()}`} />
                  <InfoRow label={t("junction")} value={camera.junctionName} />
                  <InfoRow label={t("zone")} value={camera.zoneName} />
                  <InfoRow
                    label={t("status")}
                    value={camera.status === "online" ? t("online") : t("offline")}
                    valueColor={camera.status === "online" ? "text-accent-green" : "text-accent-red"}
                  />
                </div>
              </div>

              {/* Traffic Data */}
              <div>
                <h4 className="text-[10px] uppercase tracking-widest text-text-muted mb-2">{t("trafficData")}</h4>
                <div className="space-y-2">
                  <InfoRow label={t("vph")} value={String(traffic?.vehiclesPerHour ?? "—")} />
                  <InfoRow label={t("speed")} value={traffic ? `${Math.round(traffic.avgSpeedKph)} km/h` : "—"} />
                  <InfoRow label={t("congestion")} value={`${congPercent}%`} valueColor={statusColor} />
                  <InfoRow label={t("status")} value={statusText} valueColor={statusColor} />
                </div>
              </div>

              {/* Incident */}
              <div>
                <h4 className="text-[10px] uppercase tracking-widest text-text-muted mb-2">{t("incidentDetected")}</h4>
                {incident ? (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 space-y-1">
                    <p className="text-xs font-semibold text-red-400">{incident.type.toUpperCase()}</p>
                    <p className="text-[10px] text-red-400/70">{t("severity")}: {incident.severity}/5</p>
                    <p className="text-[10px] text-text-muted">{t("simulatedDetection")}</p>
                  </div>
                ) : (
                  <p className="text-xs text-text-muted">{t("noIncident")}</p>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(modal, document.body);
}

function InfoRow({
  label,
  value,
  valueColor = "text-text-primary",
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-md bg-base-card px-3 py-1.5">
      <span className="text-[10px] uppercase tracking-wider text-text-muted">{label}</span>
      <span className={`text-xs font-medium ${valueColor}`}>{value}</span>
    </div>
  );
}

export default CCTVFullscreenModal;
