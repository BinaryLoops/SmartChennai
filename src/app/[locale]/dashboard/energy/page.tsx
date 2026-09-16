"use client";

import { AlertTriangle, Zap, CheckCircle, Activity, ZapOff } from "lucide-react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function EnergyDashboard() {
  const { data: overview, error: overviewError } = useSWR("/api/energy/overview", fetcher, { refreshInterval: 5000 });
  const { data: faults, error: faultsError } = useSWR("/api/energy/faults", fetcher, { refreshInterval: 5000 });

  if (overviewError || faultsError) return <div className="p-8 text-red-500">Failed to load energy data</div>;
  if (!overview || !faults) return <div className="p-8 skeleton h-96 w-full opacity-50"></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-text">Power Grid & Streetlighting</h1>
        <div className="flex items-center gap-2 text-sm text-text-muted">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
          </span>
          Live Grid Status
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <div className="rounded-card border border-border bg-base-card p-6">
          <div className="flex items-center gap-4 text-text-muted">
            <Zap className="h-5 w-5 text-yellow-500" />
            <h3 className="text-sm font-medium">Grid Stability</h3>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-text">{overview.gridStability}%</div>
            <div className="mt-1 text-sm text-text-muted">Overall system health</div>
          </div>
        </div>

        <div className="rounded-card border border-border bg-base-card p-6">
          <div className="flex items-center gap-4 text-text-muted">
            <Activity className="h-5 w-5 text-blue-400" />
            <h3 className="text-sm font-medium">Average Load</h3>
          </div>
          <div className="mt-4">
            <div className={`text-3xl font-bold ${overview.averageLoad > 85 ? "text-orange-500" : "text-text"}`}>{overview.averageLoad}%</div>
            <div className="mt-1 text-sm text-text-muted">Substation & Transformer Load</div>
          </div>
        </div>

        <div className="rounded-card border border-border bg-base-card p-6">
          <div className="flex items-center gap-4 text-text-muted">
            <ZapOff className="h-5 w-5 text-red-500" />
            <h3 className="text-sm font-medium">Active Faults</h3>
          </div>
          <div className="mt-4">
            <div className={`text-3xl font-bold ${overview.faults > 0 ? "text-red-500" : "text-emerald-500"}`}>{overview.faults}</div>
            <div className="mt-1 text-sm text-text-muted">Transformers/Substations offline</div>
          </div>
        </div>

        <div className="rounded-card border border-border bg-base-card p-6">
          <div className="flex items-center gap-4 text-text-muted">
            <CheckCircle className="h-5 w-5 text-emerald-500" />
            <h3 className="text-sm font-medium">Assets Online</h3>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-emerald-500">{overview.onlineAssets} / {overview.totalAssets}</div>
            <div className="mt-1 text-sm text-text-muted">Critical infrastructure nodes</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Maintenance Queue */}
        <div className="rounded-card border border-border bg-base-card p-6">
          <div className="flex items-center justify-between mb-6">
             <h2 className="text-lg font-bold text-text">Maintenance & Fault Queue</h2>
             <span className="px-3 py-1 bg-red-500/10 text-red-400 text-xs font-semibold rounded-full border border-red-500/20">
               {faults.length} Action Required
             </span>
          </div>
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
             {faults.length === 0 ? (
                <div className="text-center text-text-muted py-8 flex flex-col items-center">
                  <CheckCircle className="h-8 w-8 text-emerald-500 mb-2 opacity-50" />
                  All grid assets are operating normally.
                </div>
             ) : faults.map((fault: any) => (
               <div key={fault.id} className="flex items-center justify-between p-4 rounded-lg bg-base/50 border border-border border-l-4 border-l-red-500">
                  <div>
                    <div className="font-semibold text-text">{fault.type} {fault.id.slice(0, 8)}...</div>
                    <div className="text-sm text-red-400 mt-1">Impact: {fault.affectedStreetlights} streetlights, {fault.affectedAssets} critical assets</div>
                  </div>
                  <div className="text-right">
                     <div className="text-sm font-bold text-red-500">{fault.status}</div>
                     <div className="text-xs text-text-muted mt-1">Reported: {new Date(fault.updatedAt).toLocaleTimeString()}</div>
                  </div>
               </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
}
