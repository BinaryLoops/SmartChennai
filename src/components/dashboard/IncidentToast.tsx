"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { IncidentPayload } from "@packages/types";

interface IncidentToastProps {
  latestIncident: IncidentPayload | null;
}

interface ToastItem {
  id: string;
  incident: IncidentPayload;
  createdAt: number;
}

const TOAST_DURATION = 8000;
const MAX_TOASTS = 3;

const INCIDENT_ICONS: Record<string, string> = {
  fire: "🔥",
  traffic: "🚗",
  flood: "🌊",
  medical: "🏥",
};

const INCIDENT_LABELS: Record<string, string> = {
  fire: "Fire",
  traffic: "Traffic Accident",
  flood: "Flood",
  medical: "Medical Emergency",
};

const SEVERITY_COLORS: Record<number, string> = {
  2: "bg-accent-amber/20 text-accent-amber",
  3: "bg-accent-amber/30 text-accent-amber",
  4: "bg-accent-red/20 text-accent-red",
  5: "bg-accent-red/30 text-accent-red",
};

export function IncidentToast({ latestIncident }: IncidentToastProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    if (!latestIncident) return;

    const newToast: ToastItem = {
      id: `${latestIncident.id}-${Date.now()}`,
      incident: latestIncident,
      createdAt: Date.now(),
    };

    setToasts((prev) => [newToast, ...prev].slice(0, MAX_TOASTS));
  }, [latestIncident]);

  // Auto-dismiss timer
  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setInterval(() => {
      const now = Date.now();
      setToasts((prev) => prev.filter((t) => now - t.createdAt < TOAST_DURATION));
    }, 1000);
    return () => clearInterval(timer);
  }, [toasts.length]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-[9998] flex flex-col gap-3">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => {
          const inc = toast.incident;
          const icon = INCIDENT_ICONS[inc.type] || "⚠️";
          const label = INCIDENT_LABELS[inc.type] || inc.type;
          const sevClass =
            SEVERITY_COLORS[inc.severity] || "bg-accent-amber/20 text-accent-amber";

          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, x: 80, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 80, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="w-80 overflow-hidden rounded-card border border-border bg-base-elevated shadow-2xl"
            >
              <div className="flex items-start gap-3 px-4 py-3">
                {/* Icon */}
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-base-card text-lg">
                  {icon}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-text-primary">
                      {label}
                    </p>
                    <span
                      className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${sevClass}`}
                    >
                      SEV {inc.severity}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-text-secondary">
                    {inc.lat.toFixed(4)}, {inc.lng.toFixed(4)}
                  </p>
                  <p className="text-[10px] text-text-muted">
                    {new Date(inc.reportedAt).toLocaleTimeString()} •{" "}
                    Source: {inc.source}
                  </p>
                </div>

                {/* Close */}
                <button
                  onClick={() => dismiss(toast.id)}
                  className="shrink-0 text-text-muted transition-colors hover:text-text-primary"
                  aria-label="Dismiss"
                >
                  ✕
                </button>
              </div>

              {/* Progress bar */}
              <div className="h-0.5 bg-border">
                <motion.div
                  className="h-full bg-accent-cyan/50"
                  initial={{ width: "100%" }}
                  animate={{ width: "0%" }}
                  transition={{ duration: TOAST_DURATION / 1000, ease: "linear" }}
                />
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

export default IncidentToast;
