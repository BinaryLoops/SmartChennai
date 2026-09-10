"use client";

import { motion } from "framer-motion";
import clsx from "clsx";
import type { IncidentPayload, WaterUpdatePayload } from "@packages/types";

const TYPE_ICONS: Record<string, string> = {
  traffic: "🚗",
  fire: "🔥",
  medical: "🏥",
  flood: "🌊",
};

const SEVERITY_COLORS: Record<number, string> = {
  1: "bg-green-500/20 text-green-400",
  2: "bg-lime-500/20 text-lime-400",
  3: "bg-amber-500/20 text-amber-400",
  4: "bg-orange-500/20 text-orange-400",
  5: "bg-red-500/20 text-red-400",
};

const RISK_COLORS: Record<string, string> = {
  watch: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  warning: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  danger: "bg-red-500/20 text-red-400 border-red-500/30",
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffSec = Math.floor((now - then) / 1000);
  if (diffSec < 60) return `${diffSec}s`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  return `${Math.floor(diffHr / 24)}d`;
}

interface IncidentCardProps {
  incident: IncidentPayload;
  index: number;
}

export function IncidentCard({ incident, index }: IncidentCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="rounded-xl border border-border bg-base-card p-4 transition-colors hover:border-border-strong"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{TYPE_ICONS[incident.type] || "⚠️"}</span>
          <div>
            <p className="text-sm font-medium capitalize text-text-primary">
              {incident.type}
            </p>
            <p className="mt-0.5 text-xs text-text-muted">
              {incident.lat.toFixed(4)}, {incident.lng.toFixed(4)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={clsx(
            "rounded-full px-2 py-0.5 text-xs font-semibold",
            SEVERITY_COLORS[incident.severity] || SEVERITY_COLORS[2]
          )}>
            {incident.severity}/5
          </span>
          <span className="text-xs text-text-muted">
            {timeAgo(incident.reportedAt)}
          </span>
        </div>
      </div>

      {(incident.reportedBy && incident.reportedBy > 1) && (
        <div className="mt-2 flex items-center gap-1 text-xs text-accent-cyan">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {incident.reportedBy} reports
        </div>
      )}

      {incident.status !== "reported" && (
        <div className="mt-2">
          <span className={clsx(
            "rounded-full px-2 py-0.5 text-xs font-medium",
            incident.status === "resolved" ? "bg-green-500/20 text-green-400" :
            incident.status === "dispatched" ? "bg-blue-500/20 text-blue-400" :
            "bg-amber-500/20 text-amber-400"
          )}>
            {incident.status}
          </span>
        </div>
      )}
    </motion.div>
  );
}

interface FloodAlertCardProps {
  sensor: WaterUpdatePayload;
  index: number;
}

export function FloodAlertCard({ sensor, index }: FloodAlertCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={clsx(
        "rounded-xl border p-4 transition-colors",
        RISK_COLORS[sensor.riskLevel] || "border-border bg-base-card"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🌊</span>
          <div>
            <p className="text-sm font-medium text-text-primary">
              {sensor.sensorName}
            </p>
            <p className="mt-0.5 text-xs text-text-muted">
              {sensor.lat.toFixed(4)}, {sensor.lng.toFixed(4)}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-text-primary">
            {sensor.waterLevelCm.toFixed(0)}
            <span className="text-xs text-text-muted"> cm</span>
          </p>
          <span className={clsx(
            "rounded-full px-2 py-0.5 text-xs font-semibold uppercase",
            RISK_COLORS[sensor.riskLevel] || "text-text-muted"
          )}>
            {sensor.riskLevel}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
