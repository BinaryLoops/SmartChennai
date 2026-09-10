"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useSocket } from "@/hooks/useSocket";
import Link from "next/link";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { KpiCard } from "@/components/ui/KpiCard";
import { SignalOverridePanel } from "@/components/traffic/SignalOverridePanel";
import { TrafficTrendChart } from "@/components/traffic/TrafficTrendChart";
import { ContinuousAIPlayer } from "@/components/cctv/ContinuousAIPlayer";
import { CCTVFullscreenModal } from "@/components/cctv/CCTVFullscreenModal";

// Dynamic import for Leaflet map to avoid SSR issues
const MiniMap = dynamic(
  () => import("@/components/traffic/MiniMap").then((m) => m.MiniMap),
  { ssr: false, loading: () => <div className="skeleton h-full w-full" /> }
);

interface JunctionDetailData {
  junction: {
    id: string;
    name: string;
    lat: number;
    lng: number;
    zone: { name: string };
  };
  history: { timestamp: string; vehiclesPerHour: number }[];
  signalOverride: { greenDuration: number; redDuration: number };
  predictions?: any[];
  modelUsed?: string;
  anomaly?: {
    isAnomaly: boolean;
    currentValue: number;
    rollingMean: number;
    threshold: number;
    details: string;
  };
}

export default function JunctionDetailPage({
  params,
}: {
  params: { junctionId: string };
}) {
  const t = useTranslations("traffic");
  const socket = useSocket();

  const [data, setData] = useState<JunctionDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCCTVModal, setShowCCTVModal] = useState(false);

  useEffect(() => {
    fetch(`/api/dashboard/traffic/${params.junctionId}`)
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load junction details:", err);
        setLoading(false);
      });
  }, [params.junctionId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-10 w-48 rounded-lg" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="skeleton h-32 rounded-card" />
            <div className="skeleton h-[400px] rounded-card" />
          </div>
          <div className="space-y-6">
            <div className="skeleton h-64 rounded-card" />
            <div className="skeleton h-64 rounded-card" />
          </div>
        </div>
      </div>
    );
  }

  if (!data?.junction) {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-text-muted">
        <p className="mb-4">{t("notFound")}</p>
        <Link
          href="/dashboard/traffic"
          className="rounded-md border border-border px-4 py-2 hover:bg-base-card"
        >
          {t("backToTraffic")}
        </Link>
      </div>
    );
  }

  const j = data.junction;
  const liveData = socket.trafficByJunction.get(j.id);

  // Use live data if connected, otherwise fallback (though fallback vph/speed aren't in this API response)
  const vph = liveData?.vehiclesPerHour ?? 0;
  const speed = liveData?.avgSpeedKph ?? 0;
  const cong = liveData?.congestionLevel ?? 0;
  const congPercent = Math.round(cong * 100);

  // Status computation
  let statusColor = "text-accent-green";
  let statusText = t("statusNormal");
  if (congPercent > 80) {
    statusColor = "text-accent-red";
    statusText = t("statusCritical");
  } else if (congPercent > 60) {
    statusColor = "text-accent-amber";
    statusText = t("statusWarning");
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/traffic"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-base-card text-text-secondary transition-colors hover:text-text-primary"
          aria-label="Back"
        >
          ←
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{j.name}</h1>
          <p className="text-sm text-text-muted">{j.zone.name} Zone</p>
        </div>
        <div className={`ml-auto px-4 py-1.5 rounded-full border border-border bg-base-card text-sm font-semibold ${statusColor}`}>
          {statusText}
        </div>
      </div>

      {/* Anomaly Banner */}
      {data.anomaly?.isAnomaly && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-3 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-red-400"
        >
          <span className="text-2xl">⚠️</span>
          <div>
            <h3 className="font-bold">{t("anomalyDetected", { fallback: "Anomaly Detected" })}</h3>
            <p className="text-sm opacity-80">{data.anomaly.details}</p>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Live KPIs */}
          <div className="grid grid-cols-3 gap-4">
            <KpiCard
              label={t("vph")}
              value={vph}
              accent="cyan"
            />
            <KpiCard
              label={t("speed")}
              value={Math.round(speed)}
              suffix=" km/h"
              accent="cyan"
            />
            <KpiCard
              label={t("congestion")}
              value={congPercent}
              suffix="%"
              accent={congPercent > 80 ? "red" : congPercent > 60 ? "amber" : "green"}
            />
          </div>

          {/* Chart */}
          <div className="h-[400px] rounded-card border border-border bg-base-card p-5 shadow-lg relative">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-text-primary">
                {t("trafficTrend")}
              </h3>
              {data.predictions && data.predictions.length > 0 && (
                <div className="flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs text-amber-500">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500"></span>
                  </span>
                  {t("aiPrediction", { fallback: "AI Prediction" })} ({data.modelUsed})
                </div>
              )}
            </div>
            <div className="h-[calc(100%-2rem)]">
              <TrafficTrendChart history={data.history} predictions={data.predictions} />
            </div>
          </div>
        </div>

        {/* Sidebar Column */}
        <div className="flex flex-col gap-6">
          {/* Mini Map */}
          <div className="h-64 rounded-card border border-border bg-base-card p-1 shadow-lg">
            <MiniMap lat={j.lat} lng={j.lng} name={j.name} />
          </div>

          {/* CCTV Feed */}
          <div className="rounded-card border border-border bg-base-card p-3 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">CCTV Feed</h3>
              <button
                onClick={() => setShowCCTVModal(true)}
                className="text-[10px] text-text-muted hover:text-accent-cyan transition-colors"
              >
                Fullscreen
              </button>
            </div>
            <ContinuousAIPlayer
              cameraId={j.id}
              junctionName={j.name}
              zoneName={j.zone.name}
              vehiclesPerHour={vph}
              congestionLevel={cong}
              avgSpeed={speed}
              incident={
                socket.incidents.find(
                  (inc) =>
                    inc.status === "reported" &&
                    Math.sqrt(Math.pow(inc.lat - j.lat, 2) + Math.pow(inc.lng - j.lng, 2)) < 0.01
                )
                  ? {
                      type: socket.incidents.find(
                        (inc) =>
                          inc.status === "reported" &&
                          Math.sqrt(Math.pow(inc.lat - j.lat, 2) + Math.pow(inc.lng - j.lng, 2)) < 0.01
                      )!.type,
                      severity: socket.incidents.find(
                        (inc) =>
                          inc.status === "reported" &&
                          Math.sqrt(Math.pow(inc.lat - j.lat, 2) + Math.pow(inc.lng - j.lng, 2)) < 0.01
                      )!.severity,
                    }
                  : null
              }
              className="aspect-video w-full"
              onClick={() => setShowCCTVModal(true)}
              enabled={["CAM-KTP-01", "CAM-TYN-03", "CAM-MAR-02", "CAM-AMB-04"].includes(j.id)}
            />
          </div>

          {/* Override Panel */}
          <div className="flex-1">
            <SignalOverridePanel
              junctionId={j.id}
              initialGreen={data.signalOverride.greenDuration}
              initialRed={data.signalOverride.redDuration}
            />
          </div>
        </div>
      </div>

      {/* CCTV Fullscreen Modal */}
      {showCCTVModal && (
        <CCTVFullscreenModal
          camera={{
            id: j.id,
            junctionId: j.id,
            junctionName: j.name,
            zoneName: j.zone.name,
            lat: j.lat,
            lng: j.lng,
            status: "online",
          }}
          traffic={{
            vehiclesPerHour: vph,
            congestionLevel: cong,
            avgSpeedKph: speed,
          }}
          incident={(() => {
            const inc = socket.incidents.find(
              (i) =>
                i.status === "reported" &&
                Math.sqrt(Math.pow(i.lat - j.lat, 2) + Math.pow(i.lng - j.lng, 2)) < 0.01
            );
            return inc ? { type: inc.type, severity: inc.severity, status: inc.status } : null;
          })()}
          onClose={() => setShowCCTVModal(false)}
        />
      )}
    </motion.div>
  );
}
