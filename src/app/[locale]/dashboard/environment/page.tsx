"use client";

import { useEffect, useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useSocket } from "@/hooks/useSocket";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { KpiCard } from "@/components/ui/KpiCard";
import Link from "next/link";

const EnvironmentMap = dynamic(() => import("@/components/environment/EnvironmentMap"), {
  ssr: false,
  loading: () => <div className="skeleton h-full w-full rounded-card" />,
});

const EnvironmentTrendChart = dynamic(
  () => import("@/components/environment/EnvironmentTrendChart"),
  { ssr: false }
);

interface SensorData {
  id: string;
  name: string;
  lat: number;
  lng: number;
  zoneId: string;
  status: string;
  aqi: number;
  temperature: number;
  rainfall: number;
  pm25: number;
  noise: number;
}

export default function EnvironmentDashboard() {
  const t = useTranslations("environment");
  const socket = useSocket();

  const [initialSensors, setInitialSensors] = useState<SensorData[]>([]);
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
    fetch("/api/dashboard/environment")
      .then((res) => res.json())
      .then((data) => {
        setInitialSensors(data.sensors || []);
        setLoading(false);
      })
      .catch(console.error);
  }, []);

  const liveSensors = useMemo(() => {
    return initialSensors.map((s) => {
      const aqiReading = socket.telemetry?.get(`${s.id}_aqi`);
      const tempReading = socket.telemetry?.get(`${s.id}_temperature`);
      const rainReading = socket.telemetry?.get(`${s.id}_rainfall`);
      
      let update: any = {};
      if (aqiReading) {
        update.aqi = aqiReading.value;
        update.timestamp = aqiReading.timestamp;
        if (aqiReading.quality === "STALE") {
          update.status = "DEGRADED";
        } else if (aqiReading.quality === "LIVE") {
          update.status = "HEALTHY";
        } else if (aqiReading.quality === "OFFLINE") {
          update.status = "OFFLINE";
        }
      }
      if (tempReading) update.temperature = tempReading.value;
      if (rainReading) update.rainfall = rainReading.value;

      return {
        ...s,
        ...update
      };
    });
  }, [initialSensors, socket.telemetry]);

  const activeAlerts = liveSensors.filter((s) => s.status !== "OFFLINE" && s.aqi > 150).length;
  const criticalLevels = liveSensors.filter((s) => s.status !== "OFFLINE" && s.aqi > 200).length;
  const highestAqi = liveSensors.length > 0 ? Math.max(...liveSensors.filter(s => s.status !== "OFFLINE").map((s) => s.aqi)) : 0;
  const sensorsOnline = liveSensors.filter(s => s.status !== "OFFLINE").length;

  const selectedSensor = liveSensors.find((s) => s.id === selectedSensorId);

  useEffect(() => {
    if (selectedSensorId) {
      setLoadingHistory(true);
      fetch(`/api/dashboard/environment/${selectedSensorId}`)
        .then((res) => res.json())
        .then((data) => {
          setSensorHistory(data.history || []);
          setLoadingHistory(false);
        })
        .catch(() => setLoadingHistory(false));
    }
  }, [selectedSensorId]);

  useEffect(() => {
    if (selectedSensorId) {
      const liveAqi = socket.telemetry?.get(`${selectedSensorId}_aqi`);
      if (liveAqi && sensorHistory.length > 0) {
        const lastTs = sensorHistory[sensorHistory.length - 1].timestamp;
        if (liveAqi.timestamp && liveAqi.timestamp !== lastTs) {
          setSensorHistory((prev) => [
            ...prev,
            { timestamp: liveAqi.timestamp, aqi: liveAqi.value },
          ]);
        }
      }
    }
  }, [socket.telemetry, selectedSensorId, sensorHistory.length]);

  if (loading) {
    return (
      <div className="flex h-full min-h-[500px] items-center justify-center">
        <div className="skeleton h-[400px] w-full max-w-5xl rounded-card" />
      </div>
    );
  }

  const alerts = [...liveSensors]
    .filter((s) => s.status === "OFFLINE" || s.aqi > 150)
    .sort((a, b) => b.aqi - a.aqi);

  return (
    <div className="flex h-full flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">
          {t("environmentCommand", { fallback: "Environment Command" })}
        </h1>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label={t("activeAlerts", { fallback: "Active Alerts" })} value={activeAlerts} accent={activeAlerts > 0 ? "amber" : "green"} />
        <KpiCard label={t("criticalLevels", { fallback: "Critical Levels" })} value={criticalLevels} accent={criticalLevels > 0 ? "red" : "green"} />
        <KpiCard label={t("highestAqi", { fallback: "Highest AQI" })} value={Math.round(highestAqi)} suffix="" accent={highestAqi > 200 ? "red" : highestAqi > 100 ? "amber" : "green"} />
        <KpiCard label={t("sensorsOnline", { fallback: "Sensors Online" })} value={sensorsOnline} suffix={`/${liveSensors.length}`} accent={sensorsOnline === liveSensors.length ? "green" : "amber"} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 min-h-[600px]">
        {/* Alerts & Zones */}
        <div className="flex flex-col gap-6 lg:col-span-1">
          <div className="flex flex-1 flex-col rounded-card border border-border bg-base-elevated shadow-lg">
            <div className="border-b border-border p-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-text-primary flex items-center gap-2">
                {t("alerts", { fallback: "Alerts & Status" })}
                {alerts.length > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent-red text-[10px] font-bold text-white">
                    {alerts.length}
                  </span>
                )}
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[400px]">
              <AnimatePresence mode="popLayout">
                {alerts.length === 0 && (
                  <div className="text-center text-sm text-text-muted mt-4">
                    {t("normal", { fallback: "All conditions normal" })}
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
                      <span className="font-semibold text-text-primary text-sm">{alert.name}</span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        alert.status === "OFFLINE" ? "bg-gray-500/20 text-gray-400" :
                        alert.aqi > 200 ? "bg-accent-red/20 text-accent-red animate-pulse" : "bg-accent-amber/20 text-accent-amber"
                      }`}>
                        {alert.status === "OFFLINE" ? "OFFLINE" : alert.aqi > 200 ? "HAZARDOUS" : "UNHEALTHY"}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-text-muted">
                      <span>AQI: {Math.round(alert.aqi)}</span>
                      <span>Temp: {Math.round(alert.temperature)}°C</span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Map & Detail */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          <div className="h-[400px] rounded-card border border-border bg-base-card p-1 shadow-lg relative">
            <EnvironmentMap
              sensors={liveSensors}
              selectedSensorId={selectedSensorId}
              onSensorClick={setSelectedSensorId}
            />
          </div>

          <div className="flex-1 rounded-card border border-border bg-base-card p-5 shadow-lg relative min-h-[250px]">
            {selectedSensor ? (
              <div className="h-full flex flex-col">
                <div className="flex justify-between items-end mb-4">
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-text-primary">
                      {selectedSensor.name}
                    </h3>
                    <p className="text-xs text-text-muted mt-1">{selectedSensor.status}</p>
                  </div>
                  <div className="flex gap-6 text-right">
                    <div>
                       <p className="text-[10px] uppercase text-text-muted">Temp</p>
                       <p className="font-mono text-lg font-bold text-text-primary">{Math.round(selectedSensor.temperature)}°C</p>
                    </div>
                    <div>
                       <p className="text-[10px] uppercase text-text-muted">Rain</p>
                       <p className="font-mono text-lg font-bold text-text-primary">{Math.round(selectedSensor.rainfall)}mm</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-text-muted">{t("aqi", { fallback: "AQI" })}</p>
                      <p className="font-mono text-xl font-bold text-accent-cyan">
                        {Math.round(selectedSensor.aqi)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex-1 min-h-[150px]">
                  {loadingHistory ? (
                    <div className="h-full flex items-center justify-center">
                      <div className="skeleton h-full w-full rounded" />
                    </div>
                  ) : (
                    <EnvironmentTrendChart history={sensorHistory} />
                  )}
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-text-muted">
                {t("sensorDetails", { fallback: "Select a sensor on the map to view details." })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
