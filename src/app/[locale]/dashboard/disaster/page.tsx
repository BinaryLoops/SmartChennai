"use client";

import { AlertTriangle, Map, Wind, CloudRain, AlertOctagon, Activity } from "lucide-react";
import useSWR from "swr";
import { LiveEventStream } from "@/components/dashboard/LiveEventStream";

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function DisasterDashboard() {
  const { data: overview, error } = useSWR("/api/disaster/overview", fetcher, { refreshInterval: 5000 });

  if (error) return <div className="p-8 text-red-500">Failed to load disaster data</div>;
  if (!overview) return <div className="p-8 skeleton h-96 w-full opacity-50"></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-text">Disaster & Scenario Response</h1>
        <div className="flex items-center gap-2 text-sm text-text-muted">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
          Live Overview
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-card border border-border bg-base-card p-6">
          <div className="flex items-center gap-4 text-text-muted">
            <AlertTriangle className={`h-5 w-5 ${overview.overallSeverity === 'NORMAL' ? 'text-emerald-500' : 'text-red-500'}`} />
            <h3 className="text-sm font-medium">Current Alert Level</h3>
          </div>
          <div className="mt-4">
            <div className={`text-3xl font-bold ${overview.overallSeverity === 'NORMAL' ? 'text-emerald-500' : 'text-red-500'}`}>
               {overview.overallSeverity}
            </div>
            <div className="mt-1 text-sm text-text-muted">{overview.activeScenarios.length} active scenarios</div>
          </div>
        </div>

        <div className="rounded-card border border-border bg-base-card p-6">
          <div className="flex items-center gap-4 text-text-muted">
            <Map className="h-5 w-5 text-blue-400" />
            <h3 className="text-sm font-medium">Zones Affected</h3>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-text">{overview.totalZonesAffected}</div>
            <div className="mt-1 text-sm text-text-muted">High-risk city sectors</div>
          </div>
        </div>

        <div className="rounded-card border border-border bg-base-card p-6">
          <div className="flex items-center gap-4 text-text-muted">
            <Activity className="h-5 w-5 text-orange-500" />
            <h3 className="text-sm font-medium">Emergency Demand Multiplier</h3>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-orange-500">
               {overview.activeScenarios[0]?.modifiers?.emergencyDemandMultiplier || 0}x
            </div>
            <div className="mt-1 text-sm text-text-muted">Excess burden on network</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-card border border-border bg-base-card p-6 flex flex-col min-h-[400px]">
          <h2 className="text-lg font-bold text-text mb-4">Active Causal Scenarios</h2>
          <div className="space-y-4">
             {overview.activeScenarios.length === 0 ? (
               <div className="text-text-muted italic">No active disaster scenarios. City operating normally.</div>
             ) : (
               overview.activeScenarios.map((scenario: any) => (
                 <div key={scenario.id} className="p-4 rounded-lg bg-base/50 border border-border">
                   <div className="flex items-center justify-between mb-2">
                     <h3 className="font-bold text-red-500 flex items-center gap-2">
                       <AlertOctagon className="h-4 w-4" />
                       {scenario.name}
                     </h3>
                     <span className="text-xs text-text-muted font-mono">{scenario.id}</span>
                   </div>
                   <p className="text-sm text-text-muted mb-4">{scenario.description}</p>
                   
                   <div className="grid grid-cols-2 gap-2 text-sm">
                     <div className="flex justify-between p-2 bg-base rounded">
                        <span className="text-text-muted">Flood Risk</span>
                        <span className="font-medium">{(scenario.modifiers.floodRiskMultiplier * 100).toFixed(0)}%</span>
                     </div>
                     <div className="flex justify-between p-2 bg-base rounded">
                        <span className="text-text-muted">Traffic Friction</span>
                        <span className="font-medium">+{(scenario.modifiers.trafficFriction * 100).toFixed(0)}%</span>
                     </div>
                     <div className="flex justify-between p-2 bg-base rounded">
                        <span className="text-text-muted">Power Availability</span>
                        <span className="font-medium">{(scenario.modifiers.powerGridAvailability * 100).toFixed(0)}%</span>
                     </div>
                     <div className="flex justify-between p-2 bg-base rounded">
                        <span className="text-text-muted">Water Level</span>
                        <span className="font-medium">{(scenario.modifiers.waterLevelMultiplier).toFixed(1)}x</span>
                     </div>
                   </div>
                 </div>
               ))
             )}
          </div>
        </div>
        
        <div className="rounded-card border border-border bg-base-card p-6 flex flex-col min-h-[400px]">
          <h2 className="text-lg font-bold text-text mb-4 flex items-center gap-2">
            <CloudRain className="h-5 w-5 text-blue-400" />
            Live Disaster Events
          </h2>
          <div className="flex-1 overflow-hidden relative">
            <div className="absolute inset-0">
               <LiveEventStream filter="DISASTER" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
