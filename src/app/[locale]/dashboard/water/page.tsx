"use client";

import { useEffect, useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useSocket } from "@/hooks/useSocket";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { KpiCard } from "@/components/ui/KpiCard";
import { SOCKET_EVENTS, riskLevelFor } from "@packages/types";
import Link from "next/link";

const WaterMap = dynamic(() => import("@/components/water/WaterMap"), {
  ssr: false,
  loading: () => <div className="skeleton h-full w-full rounded-card" />,
});

const WaterTrendChart = dynamic(
  () => import("@/components/water/WaterTrendChart"),
  { ssr: false }
);

interface SensorData {
  id: string;
  name: string;
  zoneId: string;
  zoneName: string;
  lat: number;
  lng: number;
  waterLevel: number;
  riskLevel: string;
  timestamp: string;
}

interface ZoneStatus {
  id: string;
  name: string;
  status: string;
  maxLevel: number;
}

export default function WaterDashboard() {
  const t = useTranslations("water");
  const socket = useSocket();

  const [aiPredictions, setAiPredictions] = useState<Record<string, any>>({});

  const [initialSensors, setInitialSensors] = useState<SensorData[]>([]);
  const [zones, setZones] = useState<{ id: string; name: string }[]>([]);
  const [floodIncidents, setFloodIncidents] = useState<any[]>([]);
  const [monsoonEnabled, setMonsoonEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedSensorId, setSelectedSensorId] = useState<string | null>(null);
  const [sensorHistory, setSensorHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);

  useEffect(() => {
    const match = document.cookie.match(/(^| )user_role=([^;]+)/);
    if (match) {
      const role = match[2];
      setIsReadOnly(role === "dm" || role === "commissioner");
    }
  }, []);

  useEffect(() => {
    fetch("/api/dashboard/water")
      .then((res) => res.json())
      .then((data) => {
        setZones(data.zones || []);
        setFloodIncidents(data.floodIncidents || []);
        setMonsoonEnabled(data.monsoonEnabled);

        const mapped = (data.sensors || []).map((s: any) => ({
          ...s,
          riskLevel: riskLevelFor(s.waterLevel),
        }));
        setInitialSensors(mapped);
        setLoading(false);
      })
      .catch(console.error);
  }, []);

  // Sync new flood incidents
  useEffect(() => {
    if (socket.latestIncident && socket.latestIncident.type === "flood") {
      const payload = socket.latestIncident;
      setFloodIncidents((prev) => {
        if (prev.some((i) => i.id === payload.id)) return prev;
        return [payload, ...prev];
      });
    }
  }, [socket.latestIncident]);

  // Combine initial data with live socket updates
  const liveSensors = useMemo(() => {
    return initialSensors.map((s) => {
      const live = socket.waterBySensor.get(s.id);
      if (live) {
        return {
          ...s,
          waterLevel: live.waterLevelCm,
          riskLevel: live.riskLevel,
          timestamp: live.timestamp,
        };
      }
      return s;
    });
  }, [initialSensors, socket.waterBySensor]);

  // Calculate Zone Statuses
  const zoneStatuses: ZoneStatus[] = useMemo(() => {
    return zones.map((z) => {
      const sensorsInZone = liveSensors.filter((s) => s.zoneId === z.id);
      if (sensorsInZone.length === 0) return { id: z.id, name: z.name, status: "normal", maxLevel: 0 };
      const maxLevel = Math.max(...sensorsInZone.map((s) => s.waterLevel));
      return {
        id: z.id,
        name: z.name,
        status: riskLevelFor(maxLevel),
        maxLevel,
      };
    });
  }, [zones, liveSensors]);

  // Fetch AI Predictions for zones with high levels
  useEffect(() => {
    const fetchPredictions = async () => {
      for (const zs of zoneStatuses) {
        if (zs.maxLevel > 80) { // Only predict for elevated levels
          try {
            const res = await fetch("/api/predict/flood-risk", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ zoneId: zs.id, currentWaterLevel: zs.maxLevel, rainfall: monsoonEnabled ? 25 : 0 }),
            });
            if (res.ok) {
              const data = await res.json();
              setAiPredictions((prev) => ({ ...prev, [zs.id]: data }));
            }
          } catch (e) {
            console.warn("Failed to fetch flood risk for zone", zs.id);
          }
        } else if (aiPredictions[zs.id]) {
          // clear it if it drops
          setAiPredictions((prev) => {
            const next = { ...prev };
            delete next[zs.id];
            return next;
          });
        }
      }
    };
    
    // Throttle fetches to avoid spamming
    const timeout = setTimeout(fetchPredictions, 5000);
    return () => clearTimeout(timeout);
  }, [zoneStatuses, monsoonEnabled]);

  // KPIs
  const activeAlerts = liveSensors.filter(
    (s) => s.riskLevel === "danger" || s.riskLevel === "warning"
  ).length;
  const criticalLevels = liveSensors.filter((s) => s.riskLevel === "danger").length;
  const highestLevel = liveSensors.length > 0 ? Math.max(...liveSensors.map((s) => s.waterLevel)) : 0;

  // Selected Sensor
  const selectedSensor = liveSensors.find((s) => s.id === selectedSensorId);

  useEffect(() => {
    if (selectedSensorId) {
      setLoadingHistory(true);
      fetch(`/api/dashboard/water/${selectedSensorId}`)
        .then((res) => res.json())
        .then((data) => {
          setSensorHistory(data.history || []);
          setLoadingHistory(false);
        })
        .catch(() => setLoadingHistory(false));
    }
  }, [selectedSensorId]);

  // If a live update comes in for the selected sensor, push it to history to keep the chart moving
  useEffect(() => {
    if (selectedSensorId) {
      const live = socket.waterBySensor.get(selectedSensorId);
      if (live && sensorHistory.length > 0) {
        const lastTs = sensorHistory[sensorHistory.length - 1].timestamp;
        if (live.timestamp !== lastTs) {
          setSensorHistory((prev) => [
            ...prev,
            { timestamp: live.timestamp, waterLevel: live.waterLevelCm },
          ]);
        }
      }
    }
  }, [socket.waterBySensor, selectedSensorId, sensorHistory.length]); // Intentionally omitting full history array

  const toggleMonsoon = () => {
    if (isReadOnly) return;
    const newState = !monsoonEnabled;
    setMonsoonEnabled(newState);
    // Emit directly to worker to persist and update engine
    socket.emit(SOCKET_EVENTS.settingsUpdate, { monsoonEnabled: newState }, (ack) => {
      if (ack) setMonsoonEnabled(ack.monsoonEnabled);
    });
  };

  if (loading) {
    return (
      <div className="flex h-full min-h-[500px] items-center justify-center">
        <div className="skeleton h-[400px] w-full max-w-5xl rounded-card" />
      </div>
    );
  }

  // Active Flood Alerts List (Warning or Danger)
  const alerts = [...liveSensors]
    .filter((s) => s.riskLevel === "warning" || s.riskLevel === "danger")
    .sort((a, b) => b.waterLevel - a.waterLevel);

  return (
    <div className="flex h-full flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">
          {t("waterCommand")}
        </h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-text-muted">{t("monsoonSim")}:</span>
          <button
            onClick={toggleMonsoon}
            disabled={isReadOnly}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
              monsoonEnabled ? "bg-accent-cyan" : "bg-base-elevated"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                monsoonEnabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label={t("activeAlerts")} value={activeAlerts} accent={activeAlerts > 0 ? "amber" : "green"} />
        <KpiCard label={t("criticalLevels")} value={criticalLevels} accent={criticalLevels > 0 ? "red" : "green"} />
        <KpiCard label={t("highestLevel")} value={highestLevel} suffix=" cm" accent="cyan" />
        <KpiCard label={t("sensorsOnline")} value={liveSensors.length} accent="green" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 min-h-[600px]">
        {/* Left Col: Alerts & Zones */}
        <div className="flex flex-col gap-6 lg:col-span-1">
          {/* Alerts Panel */}
          <div className="flex flex-1 flex-col rounded-card border border-border bg-base-elevated shadow-lg">
            <div className="border-b border-border p-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-text-primary flex items-center gap-2">
                {t("activeAlerts")}
                {alerts.length > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent-red text-[10px] font-bold text-white">
                    {alerts.length}
                  </span>
                )}
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[300px]">
              <AnimatePresence mode="popLayout">
                {alerts.length === 0 && (
                  <div className="text-center text-sm text-text-muted mt-4">
                    {t("normal")}
                  </div>
                )}
                {alerts.map((alert) => (
                  <motion.div
                    key={alert.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={() => setSelectedSensorId(alert.id)}
                    className="cursor-pointer rounded-lg border border-border bg-base p-3 transition-colors hover:border-accent-cyan"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold text-text-primary">{alert.name}</span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        alert.riskLevel === "danger" ? "bg-accent-red/20 text-accent-red animate-pulse" : "bg-accent-amber/20 text-accent-amber"
                      }`}>
                        {t(alert.riskLevel)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-text-muted">
                      <span>{alert.zoneName}</span>
                      <span className="font-mono font-bold text-text-primary">{alert.waterLevel} cm</span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Zone Status Panel */}
          <div className="rounded-card border border-border bg-base-elevated shadow-lg p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-text-primary mb-4">
              {t("zoneStatus")}
            </h2>
            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2">
              {zoneStatuses.map((zs) => {
                let colorClass = "text-accent-green";
                if (zs.status === "danger") colorClass = "text-accent-red";
                else if (zs.status === "warning") colorClass = "text-accent-orange";
                else if (zs.status === "watch") colorClass = "text-accent-amber";
                
                const ai = aiPredictions[zs.id];

                return (
                  <div key={zs.id} className="flex flex-col text-sm border-b border-border/50 pb-2 last:border-0 gap-1">
                    <div className="flex justify-between items-center">
                      <span className="text-text-secondary">{zs.name}</span>
                      <span className={`font-semibold uppercase text-[10px] tracking-wider ${colorClass}`}>
                        {t(zs.status)}
                      </span>
                    </div>
                    {ai && (
                      <div className="flex items-center gap-2 rounded bg-base-card p-1.5 text-xs">
                        <span className="text-[10px] font-bold text-accent-cyan uppercase tracking-widest">{t("aiPrediction", { fallback: "AI Risk" })}</span>
                        <span className="ml-auto font-mono">{ai.riskScore}/100</span>
                        <span className="text-[10px] uppercase text-text-muted">{ai.riskCategory}</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right Col: Map & Detail */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Map */}
          <div className="h-[400px] rounded-card border border-border bg-base-card p-1 shadow-lg relative">
            <WaterMap
              sensors={liveSensors}
              incidents={floodIncidents}
              selectedSensorId={selectedSensorId}
              onSensorClick={setSelectedSensorId}
            />
            
            {floodIncidents.length > 0 && (
              <div className="absolute top-4 left-4 z-[400] bg-base-card/90 backdrop-blur border border-accent-red rounded-lg p-3 shadow-lg flex flex-col gap-2">
                <span className="text-xs font-bold text-accent-red flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-accent-red animate-pulse"></span>
                  {floodIncidents.length} Flood Incident(s) Detected
                </span>
                <Link href="/dashboard/emergency" className="text-[10px] text-center uppercase tracking-wider bg-accent-red text-white py-1 rounded">
                  View in Emergency Command
                </Link>
              </div>
            )}
          </div>

          {/* Sensor Detail Chart */}
          <div className="flex-1 rounded-card border border-border bg-base-card p-5 shadow-lg relative min-h-[250px]">
            {selectedSensor ? (
              <div className="h-full flex flex-col">
                <div className="flex justify-between items-end mb-4">
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-text-primary">
                      {selectedSensor.name}
                    </h3>
                    <p className="text-xs text-text-muted mt-1">{selectedSensor.zoneName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase text-text-muted">{t("waterLevel")}</p>
                    <p className="font-mono text-xl font-bold text-accent-cyan">
                      {selectedSensor.waterLevel} cm
                    </p>
                  </div>
                </div>
                <div className="flex-1 min-h-[150px]">
                  {loadingHistory ? (
                    <div className="h-full flex items-center justify-center">
                      <div className="skeleton h-full w-full rounded" />
                    </div>
                  ) : (
                    <WaterTrendChart history={sensorHistory} />
                  )}
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-text-muted">
                {t("sensorDetails")}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
