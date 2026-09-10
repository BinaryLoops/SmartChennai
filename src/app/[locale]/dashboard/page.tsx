"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { KpiCard } from "@/components/ui/KpiCard";
import { useSocket } from "@/hooks/useSocket";
import type { ZoneData, JunctionData, CameraData } from "@/components/dashboard/ChennaiMap";
import type { IncidentPayload } from "@packages/types";

// Dynamically import heavy components to avoid SSR issues with Leaflet
const ChennaiMap = dynamic(
  () => import("@/components/dashboard/ChennaiMap").then((m) => m.ChennaiMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center rounded-card border border-border bg-base-card">
        <div className="skeleton h-full w-full" />
      </div>
    ),
  }
);

const CongestionChart = dynamic(
  () => import("@/components/dashboard/CongestionChart").then((m) => m.CongestionChart),
  { ssr: false }
);

const IncidentToast = dynamic(
  () => import("@/components/dashboard/IncidentToast").then((m) => m.IncidentToast),
  { ssr: false }
);

interface InitialData {
  zones: ZoneData[];
  junctions: JunctionData[];
  cameras: CameraData[];
  incidents: IncidentPayload[];
  congestionHistory: { timestamp: string; avgCongestion: number }[];
  camerasOnline: number;
  totalCameras: number;
}

export default function OverviewPage() {
  const t = useTranslations("kpi");
  const socket = useSocket();

  const [initialData, setInitialData] = useState<InitialData | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch initial dashboard data from API
  useEffect(() => {
    fetch("/api/dashboard/initial")
      .then((res) => res.json())
      .then((data: InitialData) => {
        setInitialData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("[dashboard] failed to load initial data:", err);
        setLoading(false);
      });
  }, []);

  // Merge live incidents with initial incidents
  const allIncidents = [
    ...socket.incidents,
    ...(initialData?.incidents ?? []).filter(
      (i) => !socket.incidents.some((s) => s.id === i.id)
    ),
  ];

  // Merge congestion history: initial data + live socket data
  const congestionHistory = [
    ...(initialData?.congestionHistory ?? []),
    ...socket.congestionHistory,
  ];

  // KPI values: prefer live socket data, fall back to initial
  const avgCongestion = socket.avgCongestion || 0;
  const activeIncidents =
    socket.activeIncidents || (initialData?.incidents?.length ?? 0);
  const floodAlerts = socket.floodAlerts || 0;
  const camerasOnline = initialData?.camerasOnline ?? 0;

  // Determine accent color for congestion
  const congestionAccent =
    avgCongestion <= 35 ? "green" : avgCongestion <= 65 ? "amber" : "red";

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-24 rounded-card" />
          ))}
        </div>
        <div className="skeleton h-[520px] rounded-card" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Connection status indicator */}
      <div className="flex items-center justify-end gap-2">
        <span
          className={`h-2 w-2 rounded-full ${
            socket.connected ? "bg-accent-green animate-pulse" : "bg-accent-red"
          }`}
        />
        <span className="text-xs text-text-muted">
          {socket.connected ? "Live" : "Disconnected"}
        </span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard
          label={t("avgCongestion")}
          value={avgCongestion}
          suffix="%"
          accent={congestionAccent as "green" | "amber" | "red"}
        />
        <KpiCard
          label={t("activeIncidents")}
          value={activeIncidents}
          accent="red"
        />
        <KpiCard
          label={t("floodAlerts")}
          value={floodAlerts}
          accent="amber"
        />
        <KpiCard
          label={t("camerasOnline")}
          value={camerasOnline}
          accent="cyan"
        />
      </div>

      {/* Map + Chart */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Map takes 2/3 */}
        <div className="lg:col-span-2">
          <div className="h-[520px]">
            {initialData && (
              <ChennaiMap
                zones={initialData.zones}
                junctions={initialData.junctions}
                cameras={initialData.cameras}
                incidents={allIncidents}
                trafficByJunction={socket.trafficByJunction}
              />
            )}
          </div>
        </div>

        {/* Chart takes 1/3 */}
        <div className="lg:col-span-1">
          <CongestionChart data={congestionHistory} />
        </div>
      </div>

      {/* Incident toast notifications */}
      <IncidentToast latestIncident={socket.latestIncident} />
    </div>
  );
}
