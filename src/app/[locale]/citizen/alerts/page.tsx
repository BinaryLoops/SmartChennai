"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import clsx from "clsx";
import { useSocket } from "@/hooks/useSocket";
import { IncidentCard, FloodAlertCard } from "@/components/citizen/AlertsFeed";
import { AlertsMap } from "@/components/citizen/AlertsMap";
import type { WaterUpdatePayload } from "@packages/types";

type Tab = "incidents" | "flood";

export default function AlertsPage() {
  const t = useTranslations("citizen.alerts");
  const { incidents, waterBySensor } = useSocket();

  const [activeTab, setActiveTab] = useState<Tab>("incidents");
  const [autoScroll, setAutoScroll] = useState(true);
  const feedRef = useRef<HTMLDivElement>(null);

  // Get flood sensors with risk level != normal
  const floodSensors: WaterUpdatePayload[] = Array.from(waterBySensor.values()).filter(
    (w) => w.riskLevel !== "normal"
  );

  // Auto-scroll when new incidents come in
  useEffect(() => {
    if (autoScroll && feedRef.current && activeTab === "incidents") {
      feedRef.current.scrollTop = 0;
    }
  }, [incidents, autoScroll, activeTab]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-text-primary">{t("title")}</h1>
        <p className="mt-2 text-sm text-text-secondary">{t("subtitle")}</p>
      </div>

      {/* Map */}
      <div className="mb-6">
        <AlertsMap incidents={incidents} floodSensors={floodSensors} />
      </div>

      {/* Tabs */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-1 rounded-xl bg-base-card p-1">
          <button
            onClick={() => setActiveTab("incidents")}
            className={clsx(
              "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              activeTab === "incidents"
                ? "bg-accent-cyan/20 text-accent-cyan"
                : "text-text-secondary hover:text-text-primary"
            )}
          >
            {t("incidentFeed")}
            {incidents.length > 0 && (
              <span className="ml-2 rounded-full bg-accent-cyan/20 px-2 py-0.5 text-xs">
                {incidents.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("flood")}
            className={clsx(
              "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              activeTab === "flood"
                ? "bg-accent-cyan/20 text-accent-cyan"
                : "text-text-secondary hover:text-text-primary"
            )}
          >
            {t("floodAlerts")}
            {floodSensors.length > 0 && (
              <span className="ml-2 rounded-full bg-red-500/20 px-2 py-0.5 text-xs text-red-400">
                {floodSensors.length}
              </span>
            )}
          </button>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-text-muted">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="rounded border-border bg-base-elevated accent-accent-cyan"
            />
            {t("autoScroll")}
          </label>
        </div>
      </div>

      {/* Feed */}
      <div ref={feedRef} className="max-h-[600px] space-y-3 overflow-y-auto pr-1">
        {activeTab === "incidents" && (
          <>
            {incidents.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-xl border border-border bg-base-card p-8 text-center text-sm text-text-muted"
              >
                {t("noIncidents")}
              </motion.div>
            ) : (
              incidents.map((incident, i) => (
                <IncidentCard key={incident.id} incident={incident} index={i} />
              ))
            )}
          </>
        )}

        {activeTab === "flood" && (
          <>
            {floodSensors.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-xl border border-border bg-base-card p-8 text-center text-sm text-text-muted"
              >
                {t("noFloodAlerts")}
              </motion.div>
            ) : (
              floodSensors.map((sensor, i) => (
                <FloodAlertCard key={sensor.sensorId} sensor={sensor} index={i} />
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}
