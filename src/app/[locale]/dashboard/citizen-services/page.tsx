"use client";

import React from "react";
import useSWR from "swr";
import clsx from "clsx";
import { motion } from "framer-motion";

const fetcher = (url: string) => fetch(url).then(r => r.json());

const CATEGORY_ICONS: Record<string, string> = {
  ROAD: "🛣️", WATER: "💧", DRAINAGE: "🌊", STREETLIGHT: "💡",
  WASTE: "🗑️", TRAFFIC: "🚦", CCTV: "📷", PUBLIC_FACILITY: "🏛️",
  TRANSIT: "🚌", OTHER: "❓",
};

const STATUS_STYLE: Record<string, string> = {
  SUBMITTED:   "bg-slate-500/20 text-slate-300",
  RECEIVED:    "bg-blue-500/20 text-blue-300",
  VERIFIED:    "bg-indigo-500/20 text-indigo-300",
  TRIAGED:     "bg-purple-500/20 text-purple-300",
  ASSIGNED:    "bg-amber-500/20 text-amber-300",
  IN_PROGRESS: "bg-cyan-500/20 text-cyan-300",
  BLOCKED:     "bg-red-500/20 text-red-300",
  RESOLVED:    "bg-green-500/20 text-green-300",
  CLOSED:      "bg-emerald-500/20 text-emerald-300",
};

const SLA_STYLE: Record<string, string> = {
  ON_TRACK: "text-green-400",
  AT_RISK:  "text-amber-400",
  BREACHED: "text-red-400",
  RESOLVED: "text-text-muted",
};

function KpiCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-base-card p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-text-muted">{label}</p>
      <p className={clsx("mt-1 text-3xl font-bold", color ?? "text-text-primary")}>{value}</p>
      {sub && <p className="mt-1 text-xs text-text-muted">{sub}</p>}
    </div>
  );
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return s + "s ago";
  if (s < 3600) return Math.floor(s / 60) + "m ago";
  if (s < 86400) return Math.floor(s / 3600) + "h ago";
  return Math.floor(s / 86400) + "d ago";
}

export default function CitizenServicesDashboard() {
  const { data: overview } = useSWR("/api/citizen-services/overview", fetcher, { refreshInterval: 10000 });
  const { data: reqData } = useSWR("/api/citizen-services/requests?limit=20", fetcher, { refreshInterval: 8000 });
  const { data: hotspotData } = useSWR("/api/citizen-services/hotspots", fetcher, { refreshInterval: 30000 });

  const requests = reqData?.requests ?? [];
  const hotspots = hotspotData?.hotspots ?? [];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">Citizen Services Command</h1>
          <p className="mt-1 text-sm text-text-muted">
            Real-time service request intelligence — <span className="text-accent-cyan">LIVE DEMO • SIMULATED TELEMETRY</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
          <span className="text-xs text-text-muted">Live</span>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
        <KpiCard label="Requests Today" value={overview?.requestsToday ?? "—"} color="text-accent-cyan" />
        <KpiCard label="Open" value={overview?.openRequests ?? "—"} color="text-amber-400" />
        <KpiCard label="SLA At Risk" value={overview?.slaAtRisk ?? "—"} color="text-orange-400" />
        <KpiCard label="SLA Breached" value={overview?.slaBreached ?? "—"} color="text-red-400" />
        <KpiCard label="Resolved (7d)" value={overview?.resolvedLast7d ?? "—"} color="text-green-400" />
        <KpiCard
          label="Avg Resolution"
          value={overview?.avgResolutionHours != null ? overview.avgResolutionHours + "h" : "—"}
          color="text-indigo-400"
        />
        <KpiCard
          label="Satisfaction"
          value={overview?.avgRating != null ? overview.avgRating + " ⭐" : "—"}
          color="text-yellow-400"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Priority Queue */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-base-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted">Priority Request Queue</h2>
            <span className="text-xs text-text-muted">{reqData?.total ?? 0} total</span>
          </div>
          <div className="divide-y divide-border max-h-[520px] overflow-y-auto">
            {requests.length === 0 && (
              <div className="p-8 text-center text-sm text-text-muted">No active requests</div>
            )}
            {requests.map((req: any, i: number) => (
              <motion.div
                key={req.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-start gap-3 px-5 py-4"
              >
                <span className="mt-0.5 text-xl">{CATEGORY_ICONS[req.category] ?? "❓"}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-accent-cyan">{req.referenceCode}</span>
                    <span className={clsx("rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase", STATUS_STYLE[req.status] ?? "bg-base-elevated text-text-muted")}>
                      {req.status.replace("_", " ")}
                    </span>
                    <span className={clsx("text-xs font-medium", SLA_STYLE[req.slaStatus] ?? "text-text-muted")}>
                      {req.slaStatus}
                    </span>
                    <span className={clsx("rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      req.priority === "CRITICAL" ? "bg-red-500/20 text-red-300"
                      : req.priority === "HIGH" ? "bg-orange-500/20 text-orange-300"
                      : "bg-slate-500/20 text-slate-300"
                    )}>
                      {req.priority}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-sm text-text-secondary">{req.description?.substring(0, 80)}</p>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-text-muted">
                    {req.zone && <span>📍 {req.zone.name}</span>}
                    {req.asset && <span>· 🔧 {req.asset.assetCode}</span>}
                    {req.department && <span>· {req.department}</span>}
                    {req.workOrder && <span>· WO: {req.workOrder.workOrderCode}</span>}
                    <span>· {timeAgo(req.submittedAt)}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Category Breakdown */}
          <div className="rounded-2xl border border-border bg-base-card p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-text-muted">Requests by Category</h2>
            {(overview?.categoryBreakdown ?? []).length === 0 && (
              <p className="text-sm text-text-muted">No data</p>
            )}
            {(overview?.categoryBreakdown ?? []).map((c: any) => {
              const max = overview?.categoryBreakdown?.[0]?.count ?? 1;
              const pct = Math.round((c.count / max) * 100);
              return (
                <div key={c.category} className="mb-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-text-secondary">{CATEGORY_ICONS[c.category]} {c.category.replace("_", " ")}</span>
                    <span className="text-text-muted">{c.count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-base-elevated">
                    <div className="h-full rounded-full bg-accent-cyan transition-all" style={{ width: pct + "%" }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Zone Breakdown */}
          <div className="rounded-2xl border border-border bg-base-card p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-text-muted">Top Zones</h2>
            {(overview?.zoneBreakdown ?? []).map((z: any, i: number) => (
              <div key={z.zoneId ?? i} className="mb-2 flex justify-between text-sm">
                <span className="text-text-secondary truncate">{z.zoneName}</span>
                <span className="ml-2 shrink-0 font-mono text-accent-cyan">{z.count}</span>
              </div>
            ))}
            {(overview?.zoneBreakdown ?? []).length === 0 && (
              <p className="text-sm text-text-muted">No data</p>
            )}
          </div>

          {/* Hotspots */}
          <div className="rounded-2xl border border-border bg-base-card p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-text-muted">Issue Hotspots</h2>
            {hotspots.length === 0 && (
              <p className="text-sm text-text-muted">No recurring hotspots detected</p>
            )}
            {hotspots.slice(0, 5).map((h: any) => (
              <div key={h.id} className="mb-3 rounded-xl border border-border bg-base-elevated p-3">
                <div className="flex items-center gap-2">
                  <span>{CATEGORY_ICONS[h.category] ?? "❓"}</span>
                  <span className="text-xs font-semibold text-text-primary">{h.category.replace("_", " ")} — {h.zoneName}</span>
                  {h.isRecurring && (
                    <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-semibold text-red-300">RECURRING</span>
                  )}
                </div>
                <div className="mt-1 flex gap-3 text-xs text-text-muted">
                  <span>{h.totalReports} reports</span>
                  <span>{h.openReports} open</span>
                  <span className={h.trend === "INCREASING" ? "text-red-400" : "text-green-400"}>{h.trend}</span>
                </div>
                {h.affectedAssets.length > 0 && (
                  <div className="mt-1 text-[10px] text-text-muted">{h.affectedAssets.join(", ")}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
