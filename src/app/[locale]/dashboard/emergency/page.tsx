"use client";

import { useEffect, useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useSocket } from "@/hooks/useSocket";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { KpiCard } from "@/components/ui/KpiCard";

const EmergencyMap = dynamic(
  () => import("@/components/emergency/EmergencyMap"),
  { ssr: false, loading: () => <div className="skeleton h-full w-full rounded-card" /> }
);

interface EmergencyUnit {
  id: string;
  name: string;
  type: string;
  lat: number;
  lng: number;
  isAvailable: boolean;
}

interface Incident {
  id: string;
  type: string;
  lat: number;
  lng: number;
  severity: number;
  status: string;
  source: string;
  reportedAt: string;
  dispatchedAt?: string;
  resolvedAt?: string;
  unitId?: string;
  unit?: EmergencyUnit;
}

export default function EmergencyDashboard() {
  const t = useTranslations("emergency");
  const socket = useSocket();

  const [activeTab, setActiveTab] = useState<"active" | "resolved">("active");
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [resolved, setResolved] = useState<Incident[]>([]);
  const [units, setUnits] = useState<EmergencyUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isReadOnly, setIsReadOnly] = useState(false);

  useEffect(() => {
    const match = document.cookie.match(/(^| )user_role=([^;]+)/);
    if (match) {
      const role = match[2];
      setIsReadOnly(role === "dm" || role === "commissioner");
    }
  }, []);

  // Live countdown state for dispatched incidents
  const [etas, setEtas] = useState<Record<string, number>>({});

  useEffect(() => {
    fetch("/api/dashboard/emergency")
      .then((res) => res.json())
      .then((data) => {
        setIncidents(data.openIncidents || []);
        setResolved(data.resolvedIncidents || []);
        setUnits(data.units || []);
        setLoading(false);
      })
      .catch(console.error);
  }, []);

  // Handle new socket incidents
  useEffect(() => {
    if (socket.latestIncident) {
      const payload = socket.latestIncident;
      setIncidents((prev) => {
        // Prevent duplicate addition
        if (prev.some((i) => i.id === payload.id)) return prev;
        return [payload as unknown as Incident, ...prev];
      });
    }
  }, [socket.latestIncident]);

  // Priority Calculation & Sorting
  const sortedIncidents = useMemo(() => {
    const now = Date.now();
    return [...incidents].sort((a, b) => {
      const getPriority = (inc: Incident) => {
        const mins = (now - new Date(inc.reportedAt).getTime()) / 60000;
        return inc.severity * 2 + mins;
      };
      return getPriority(b) - getPriority(a);
    });
  }, [incidents]); // Re-calculates on incident changes, not every second (to avoid layout thrashing)

  // Countdown timer effect
  useEffect(() => {
    const interval = setInterval(() => {
      setEtas((prev) => {
        const next = { ...prev };
        let hasChanges = false;
        Object.keys(next).forEach((id) => {
          if (next[id] > 0) {
            next[id] -= 1;
            hasChanges = true;

            // Auto-resolve when ETA hits 0
            if (next[id] === 0) {
              handleResolve(id);
            }
          }
        });
        return hasChanges ? next : prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleDispatch = async (incidentId: string) => {
    if (isReadOnly) return;
    try {
      const bestUnit = units.find((u) => u.isAvailable);
      if (!bestUnit) {
        alert(t("noUnitsAvailable"));
        return;
      }
      const res = await fetch("/api/dashboard/emergency/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incidentId, action: "DISPATCH", unitId: bestUnit.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Setup 60s ETA timer for demonstration
      setEtas((prev) => ({ ...prev, [incidentId]: 60 }));

      // Update local state
      setIncidents((prev) =>
        prev.map((i) => (i.id === incidentId ? data.incident : i))
      );
      setUnits((prev) =>
        prev.map((u) => (u.id === data.incident.unitId ? { ...u, isAvailable: false } : u))
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : t("dispatchFailed"));
    }
  };

  const handleResolve = async (incidentId: string) => {
    try {
      const res = await fetch("/api/dashboard/emergency/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incidentId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Move to resolved list and update unit
      const resolvedInc = data.incident;
      setIncidents((prev) => prev.filter((i) => i.id !== incidentId));
      setResolved((prev) => [resolvedInc, ...prev]);
      if (resolvedInc.unitId) {
        setUnits((prev) =>
          prev.map((u) => (u.id === resolvedInc.unitId ? { ...u, isAvailable: true } : u))
        );
      }
    } catch (err) {
      console.error("Auto resolve failed", err);
    }
  };

  // KPI Calculations
  const avgResponseTime = useMemo(() => {
    const withDispatch = resolved.filter((r) => r.dispatchedAt && r.reportedAt);
    if (withDispatch.length === 0) return 0;
    const sum = withDispatch.reduce((acc, r) => {
      return acc + (new Date(r.dispatchedAt!).getTime() - new Date(r.reportedAt).getTime());
    }, 0);
    return Math.round(sum / withDispatch.length / 60000); // mins
  }, [resolved]);

  if (loading) {
    return (
      <div className="flex h-full min-h-[500px] items-center justify-center">
        <div className="skeleton h-[400px] w-full max-w-5xl rounded-card" />
      </div>
    );
  }

  const availableUnitsCount = units.filter((u) => u.isAvailable).length;

  return (
    <div className="flex h-full flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">
          {t("emergencyCommand")}
        </h1>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <KpiCard
          label={t("activeEmergencies")}
          value={incidents.length}
          accent="red"
        />
        <KpiCard
          label={t("availableUnits")}
          value={availableUnitsCount}
          suffix={` / ${units.length}`}
          accent={availableUnitsCount === 0 ? "red" : "green"}
        />
        <KpiCard
          label={t("avgResponseTime")}
          value={avgResponseTime}
          suffix=" m"
          accent="amber"
        />
      </div>

      <div className="flex flex-1 gap-6 min-h-[600px]">
        {/* Left Col: Queue */}
        <div className="flex w-1/3 flex-col rounded-card border border-border bg-base-elevated shadow-lg">
          <div className="flex border-b border-border">
            <button
              onClick={() => setActiveTab("active")}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                activeTab === "active"
                  ? "border-b-2 border-accent-red text-accent-red"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              {t("activeIncidents")}
            </button>
            <button
              onClick={() => setActiveTab("resolved")}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                activeTab === "resolved"
                  ? "border-b-2 border-accent-cyan text-accent-cyan"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              {t("resolved")}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <AnimatePresence mode="popLayout">
              {activeTab === "active" && sortedIncidents.slice(0, 15).map((inc) => {
                const isDispatched = inc.status === "dispatched";
                const isSelected = selectedId === inc.id;
                const eta = etas[inc.id];
                
                return (
                  <motion.div
                    key={inc.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, height: 0 }}
                    onClick={() => setSelectedId(inc.id)}
                    className={`cursor-pointer rounded-lg border p-4 transition-colors ${
                      isDispatched ? "border-accent-amber bg-accent-amber/10 shadow-md" : isSelected ? "border-accent-cyan bg-base-card shadow-md" : "border-border bg-base"
                    }`}
                  >
                    <div className="flex justify-between">
                      <h4 className="font-semibold text-text-primary">
                        {t(`types.${inc.type}`)}
                      </h4>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        inc.severity >= 4 ? "bg-accent-red/20 text-accent-red" : "bg-accent-amber/20 text-accent-amber"
                      }`}>
                        S{inc.severity}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-text-muted flex justify-between">
                      <span>{new Date(inc.reportedAt).toLocaleTimeString()}</span>
                      <span>{inc.source}</span>
                    </div>

                    <div className="mt-4 border-t border-border pt-3">
                      {isDispatched ? (
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-semibold text-accent-amber">{t("dispatchedUnit")}</p>
                            <p className="text-sm">{inc.unit?.name}</p>
                          </div>
                          {eta !== undefined && (
                            <div className="text-right">
                              <p className="text-[10px] uppercase text-text-muted">ETA</p>
                              <p className="font-mono text-lg font-bold text-accent-cyan">
                                00:{eta.toString().padStart(2, "0")}
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDispatch(inc.id);
                          }}
                          disabled={availableUnitsCount === 0 || isReadOnly}
                          className="w-full rounded bg-accent-red py-2 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-50"
                        >
                          {t("dispatchAction")}
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}

              {activeTab === "resolved" && resolved.map((inc) => {
                const responseMins = inc.dispatchedAt && inc.reportedAt 
                  ? Math.round((new Date(inc.dispatchedAt).getTime() - new Date(inc.reportedAt).getTime()) / 60000)
                  : "-";
                  
                return (
                  <motion.div
                    key={inc.id}
                    layout
                    className="rounded-lg border border-accent-green bg-accent-green/5 shadow-sm p-4"
                  >
                    <div className="flex justify-between mb-2">
                      <h4 className="font-semibold text-text-primary line-through opacity-75">
                        {t(`types.${inc.type}`)}
                      </h4>
                      <span className="text-accent-green text-xs font-bold">✓ {t("resolved")}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-text-muted">
                      <div>
                        <p>{t("dispatchedUnit")}</p>
                        <p className="text-text-primary">{inc.unit?.name || "N/A"}</p>
                      </div>
                      <div className="text-right">
                        <p>{t("responseTime")}</p>
                        <p className="text-text-primary">{responseMins} mins</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {activeTab === "active" && sortedIncidents.length === 0 && (
              <div className="text-center text-sm text-text-muted mt-10">
                {t("noActiveIncidents")}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Map */}
        <div className="flex-1 rounded-card border border-border bg-base-card p-1 shadow-lg relative overflow-hidden">
          <EmergencyMap
            incidents={incidents}
            units={units}
            selectedIncidentId={selectedId}
          />
        </div>
      </div>
    </div>
  );
}
