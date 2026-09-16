"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Trash2, Truck, CheckCircle, TrendingUp, Clock, AlertOctagon } from "lucide-react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function WasteDashboard() {
  const { data: overview, error } = useSWR("/api/waste/overview", fetcher, { refreshInterval: 5000 });
  const { data: fleetInfo } = useSWR("/api/waste/fleet", fetcher, { refreshInterval: 5000 });

  if (error) return <div className="p-8 text-red-500">Failed to load waste data</div>;
  if (!overview || !fleetInfo) return <div className="p-8 skeleton h-96 w-full opacity-50"></div>;

  const metrics = overview.metrics;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-text">Sanitation & Waste Operations</h1>
        <div className="flex items-center gap-2 text-sm text-text-muted">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          Live Overview
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <div className="rounded-card border border-border bg-base-card p-6">
          <div className="flex items-center gap-4 text-text-muted">
            <Trash2 className="h-5 w-5 text-emerald-500" />
            <h3 className="text-sm font-medium">Total Bins</h3>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-text">{metrics.totalBins}</div>
            <div className="mt-1 text-sm text-text-muted">Citywide tracked assets</div>
          </div>
        </div>

        <div className="rounded-card border border-border bg-base-card p-6">
          <div className="flex items-center gap-4 text-text-muted">
            <TrendingUp className="h-5 w-5 text-blue-400" />
            <h3 className="text-sm font-medium">Avg Fill Level</h3>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-text">{metrics.avgFill}%</div>
            <div className="mt-1 text-sm text-emerald-500 font-medium">Stable</div>
          </div>
        </div>

        <div className="rounded-card border border-border bg-base-card p-6">
          <div className="flex items-center gap-4 text-text-muted">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <h3 className="text-sm font-medium">Overflowing Bins</h3>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-red-500">{metrics.overflowingBins}</div>
            <div className="mt-1 text-sm text-text-muted">{metrics.nearCapacityBins} approaching capacity</div>
          </div>
        </div>

        <div className="rounded-card border border-border bg-base-card p-6">
          <div className="flex items-center gap-4 text-text-muted">
            <CheckCircle className="h-5 w-5 text-emerald-500" />
            <h3 className="text-sm font-medium">Collection SLA</h3>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-emerald-500">{metrics.slasMet}%</div>
            <div className="mt-1 text-sm text-text-muted">Collections within target time</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Collections */}
        <div className="rounded-card border border-border bg-base-card p-6">
          <div className="flex items-center justify-between mb-6">
             <h2 className="text-lg font-bold text-text">Active Fleet Routes</h2>
             <span className="px-3 py-1 bg-blue-500/10 text-blue-400 text-xs font-semibold rounded-full border border-blue-500/20">
               {overview.activeRoutes.length} In Progress
             </span>
          </div>
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
            {overview.activeRoutes.length === 0 ? (
               <div className="text-center text-text-muted py-8">No active routes.</div>
            ) : overview.activeRoutes.map((route: any) => (
              <div key={route.id} className="flex items-center justify-between p-4 rounded-lg bg-base/50 border border-border">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-500/10 rounded-lg">
                    <Truck className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <div className="font-semibold text-text">Vehicle {route.vehicleCode}</div>
                    <div className="text-sm text-text-muted">{route.stops.length} stops remaining</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-emerald-400">{route.status}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Priority Bins */}
        <div className="rounded-card border border-border bg-base-card p-6">
          <div className="flex items-center justify-between mb-6">
             <h2 className="text-lg font-bold text-text">Priority Bins (Dispatch Queue)</h2>
             <span className="px-3 py-1 bg-red-500/10 text-red-400 text-xs font-semibold rounded-full border border-red-500/20">
               Action Required
             </span>
          </div>
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
             {overview.bins.filter((b: any) => !b.assignedVehicle && b.fillPercentage >= 80)
               .sort((a: any, b: any) => b.fillPercentage - a.fillPercentage)
               .map((bin: any) => (
               <div key={bin.id} className="flex items-center justify-between p-4 rounded-lg bg-base/50 border border-border border-l-4 border-l-red-500">
                  <div>
                    <div className="font-semibold text-text">Bin {bin.id.slice(0, 6)} - {bin.zoneName}</div>
                    <div className="text-sm text-red-400 mt-1">Overflow ETA: {bin.predictedOverflow ? new Date(bin.predictedOverflow).toLocaleTimeString() : 'Unknown'}</div>
                  </div>
                  <div className="text-right">
                     <div className="text-2xl font-bold text-red-500">{bin.fillPercentage}%</div>
                     <div className="text-xs text-text-muted">Unassigned</div>
                  </div>
               </div>
             ))}
             {overview.bins.filter((b: any) => !b.assignedVehicle && b.fillPercentage >= 80).length === 0 && (
                <div className="text-center text-text-muted py-8 flex flex-col items-center">
                  <CheckCircle className="h-8 w-8 text-emerald-500 mb-2 opacity-50" />
                  All critical bins have been assigned or cleared.
                </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}
