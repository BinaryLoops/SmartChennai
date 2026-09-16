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

import { OperationsPanel } from "@/components/dashboard/OperationsPanel";
import { CityHealthWidget } from "@/components/dashboard/CityHealthWidget";
import { ZoneContextPanel } from "@/components/dashboard/ZoneContextPanel";
import { LiveEventStream } from "@/components/dashboard/LiveEventStream";

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
  const activeIncidents = socket.activeIncidents || (initialData?.incidents?.length ?? 0);
  const floodAlerts = socket.floodAlerts || 0;
  const camerasOnline = initialData?.camerasOnline ?? 0;
  const totalCameras = initialData?.totalCameras ?? 0;

  // Determine accent color for congestion
  const congestionAccent = avgCongestion <= 35 ? "green" : avgCongestion <= 65 ? "amber" : "red";

  // --- Calculate Density Metrics ---
  const now = new Date();
  const timeFormatter = new Intl.DateTimeFormat("en-US", { hour: 'numeric', minute: '2-digit', second: '2-digit' });
  const lastUpdated = timeFormatter.format(now);

  // 1. Congestion Context
  let congestionTrend = "";
  let congestionTrendColor: "red" | "green" | "amber" | "gray" = "gray";
  if (congestionHistory.length > 0) {
    // Find reading roughly 30 mins ago, or oldest
    const thirtyMinsAgo = new Date(now.getTime() - 30 * 60000);
    const reference = congestionHistory.find(h => new Date(h.timestamp) >= thirtyMinsAgo) || congestionHistory[0];
    const diff = avgCongestion - reference.avgCongestion;
    const diffMins = Math.max(1, Math.round((now.getTime() - new Date(reference.timestamp).getTime()) / 60000));
    const sign = diff > 0 ? "↑" : diff < 0 ? "↓" : "";
    if (diff !== 0) {
      congestionTrend = `${sign} ${Math.abs(diff)} pp vs ${diffMins} min`;
      congestionTrendColor = diff > 0 ? "red" : "green";
    } else {
      congestionTrend = `Unchanged vs ${diffMins} min`;
    }
  }
  const congestedJunctionsCount = Array.from(socket.trafficByJunction.values()).filter(r => r.congestionLevel >= 0.8).length;
  const totalJunctions = socket.trafficByJunction.size || initialData?.junctions.length || 0;
  const congestionSubtext = congestedJunctionsCount > 0 ? `${congestedJunctionsCount} / ${totalJunctions} junctions affected` : "All junctions normal";

  // 2. Incident Context
  const criticalIncidents = allIncidents.filter(i => i.severity === 5 && i.status !== "resolved").length;
  const incidentTrend = criticalIncidents > 0 ? `${criticalIncidents} critical` : "No critical";
  const incidentTrendColor = criticalIncidents > 0 ? "red" : "green";
  const affectedZonesCount = new Set(allIncidents.filter(i => i.status !== "resolved").map(i => {
    // try to find zone from location? Actually incidents don't explicitly have zone in initialData, they have lat/lng
    // A rough proxy is enough, or just 'active incidents'
    return i.lat.toFixed(3) + i.lng.toFixed(3);
  })).size;
  const incidentSubtext = affectedZonesCount > 0 ? `${affectedZonesCount} areas affected` : "No active incidents";

  // 3. Water Context
  let floodSubtext = "No active alerts";
  if (floodAlerts > 0) {
    const dangerSensors = Array.from(socket.waterBySensor.values()).filter(w => w.riskLevel === "danger" || w.riskLevel === "warning");
    const uniqueZones = Array.from(new Set(dangerSensors.map(s => s.zoneId)));
    floodSubtext = `${uniqueZones.length} zones affected`;
  }

  // 4. CCTV Context
  const offlineCameras = totalCameras - camerasOnline;
  const degradedCameras = 0; // future enhancement
  const cameraSubtext = offlineCameras > 0 ? `${degradedCameras} degraded, ${offlineCameras} offline` : "All systems operational";

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
          trend={congestionTrend}
          trendColor={congestionTrendColor}
          subtext={congestionSubtext}
          lastUpdated={lastUpdated}
        />
        <KpiCard
          label={t("activeIncidents")}
          value={activeIncidents}
          accent="red"
          trend={incidentTrend}
          trendColor={incidentTrendColor}
          subtext={incidentSubtext}
          lastUpdated={lastUpdated}
        />
        <KpiCard
          label={t("floodAlerts")}
          value={floodAlerts}
          accent="amber"
          trend={floodAlerts > 0 ? "Elevated Risk" : "Normal"}
          trendColor={floodAlerts > 0 ? "amber" : "green"}
          subtext={floodSubtext}
          lastUpdated={lastUpdated}
        />
        <KpiCard
          label={t("camerasOnline")}
          value={camerasOnline}
          suffix={` / ${totalCameras}`}
          accent="cyan"
          trend={offlineCameras > 0 ? "Maintenance Required" : "Optimal"}
          trendColor={offlineCameras > 0 ? "amber" : "green"}
          subtext={cameraSubtext}
          lastUpdated={lastUpdated}
        />
      </div>

      {/* Map + Chart + Side Panels */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-4">
        
        {/* Main Content (Map, Chart, Operations) */}
        <div className="xl:col-span-3 space-y-5">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {/* Map takes 2/3 */}
            <div className="lg:col-span-2">
              <div className="h-[520px]">
                {initialData && (
                  <ChennaiMap
                    zones={initialData.zones}
                    junctions={initialData.junctions}
                    cameras={initialData.cameras}
                    incidents={allIncidents.filter(i => i.status !== "resolved")}
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

          {/* Operations Command Center */}
          <OperationsPanel incidents={allIncidents} />
        </div>

        {/* Live City State Sidebar */}
        <div className="xl:col-span-1 space-y-5 flex flex-col h-[820px]">
          <CityHealthWidget />
          <ZoneContextPanel />
          <div className="flex-1 overflow-hidden min-h-[400px]">
            <LiveEventStream />
          </div>
        </div>
      </div>

      {/* Incident toast notifications */}
      <IncidentToast latestIncident={socket.latestIncident} />
    </div>
  );
}
