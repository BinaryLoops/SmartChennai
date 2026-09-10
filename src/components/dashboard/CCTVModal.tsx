"use client";

import { useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import type { CameraData } from "./ChennaiMap";

interface CCTVModalProps {
  camera: CameraData;
  onClose: () => void;
}

export function CCTVModal({ camera, onClose }: CCTVModalProps) {
  const isOnline = camera.status === "online";

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
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />

        {/* Modal content */}
        <motion.div
          className="relative z-10 w-full max-w-lg rounded-card border border-border bg-base-elevated shadow-2xl"
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-base-card text-lg">
                📹
              </div>
              <div>
                <h3 className="text-sm font-semibold text-text-primary">
                  CCTV Feed
                </h3>
                <p className="text-xs text-text-secondary">
                  {camera.junctionName}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-base-card hover:text-text-primary"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* Simulated camera feed */}
          <div className="relative mx-6 mt-5 aspect-video overflow-hidden rounded-lg bg-gradient-to-br from-base-card via-base to-base-card">
            {/* Scanlines effect */}
            <div
              className="absolute inset-0 opacity-5"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)",
              }}
            />
            {/* Center camera icon */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl opacity-30">📷</span>
              <p className="mt-2 text-xs text-text-muted">
                Simulated feed — real stream in Phase 4
              </p>
            </div>
            {/* LIVE badge */}
            {isOnline && (
              <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-md bg-accent-red/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                LIVE
              </div>
            )}
            {/* Timestamp overlay */}
            <div className="absolute bottom-3 right-3 rounded bg-black/60 px-2 py-0.5 font-mono text-[10px] text-text-secondary">
              {new Date().toLocaleTimeString()}
            </div>
          </div>

          {/* Details */}
          <div className="space-y-3 px-6 pb-6 pt-5">
            <div className="grid grid-cols-2 gap-3">
              <DetailItem label="Camera ID" value={camera.id.slice(0, 8)} />
              <DetailItem label="Junction" value={camera.junctionName} />
              <DetailItem
                label="Location"
                value={`${camera.lat.toFixed(4)}, ${camera.lng.toFixed(4)}`}
              />
              <DetailItem
                label="Status"
                value={isOnline ? "Online" : "Offline"}
                valueColor={isOnline ? "text-accent-green" : "text-accent-red"}
              />
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  // Render outside the Leaflet container to avoid map capturing the clicks
  return createPortal(modal, document.body);
}

function DetailItem({
  label,
  value,
  valueColor = "text-text-primary",
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="rounded-lg bg-base-card px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wider text-text-muted">
        {label}
      </p>
      <p className={`mt-0.5 text-sm font-medium ${valueColor}`}>{value}</p>
    </div>
  );
}

export default CCTVModal;
