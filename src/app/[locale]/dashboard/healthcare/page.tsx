"use client";

import { Activity, Ambulance, Bed, Clock, AlertOctagon, CheckCircle } from "lucide-react";
import useSWR from "swr";
import { LiveEventStream } from "@/components/dashboard/LiveEventStream";

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function HealthcareDashboard() {
  const { data: overview, error } = useSWR("/api/healthcare/overview", fetcher, { refreshInterval: 5000 });

  if (error) return <div className="p-8 text-red-500">Failed to load healthcare data</div>;
  if (!overview) return <div className="p-8 skeleton h-96 w-full opacity-50"></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-text">Healthcare & Emergency Network</h1>
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
            <Activity className="h-5 w-5 text-emerald-500" />
            <h3 className="text-sm font-medium">Operational Facilities</h3>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-text">{overview.operationalFacilities}</div>
            <div className="mt-1 text-sm text-text-muted">{overview.facilitiesUnderPressure} under high pressure</div>
          </div>
        </div>

        <div className="rounded-card border border-border bg-base-card p-6">
          <div className="flex items-center gap-4 text-text-muted">
            <Bed className="h-5 w-5 text-blue-400" />
            <h3 className="text-sm font-medium">ER Occupancy</h3>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-text">{overview.emergencyOccupancyPct}%</div>
            <div className="mt-1 text-sm text-text-muted">{overview.occupiedEmergencyBeds} / {overview.totalEmergencyBeds} ER Beds</div>
          </div>
        </div>

        <div className="rounded-card border border-border bg-base-card p-6">
          <div className="flex items-center gap-4 text-text-muted">
            <Ambulance className="h-5 w-5 text-red-500" />
            <h3 className="text-sm font-medium">Active Ambulances</h3>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-red-500">{overview.enRouteAmbulances}</div>
            <div className="mt-1 text-sm text-text-muted">{overview.availableAmbulances} available for dispatch</div>
          </div>
        </div>

        <div className="rounded-card border border-border bg-base-card p-6">
          <div className="flex items-center gap-4 text-text-muted">
            <Clock className="h-5 w-5 text-orange-500" />
            <h3 className="text-sm font-medium">Avg ER Wait Time</h3>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-orange-500">{overview.avgWaitTime} min</div>
            <div className="mt-1 text-sm text-text-muted">Across all critical facilities</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-card border border-border bg-base-card p-6">
          <h2 className="text-lg font-bold text-text mb-4">ICU Capacity</h2>
          <div className="flex flex-col space-y-4">
            <div>
               <div className="flex justify-between text-sm mb-1">
                 <span className="text-text-muted">Total ICU Beds Available</span>
                 <span className="font-semibold">{overview.totalIcuBeds - overview.occupiedIcuBeds} / {overview.totalIcuBeds}</span>
               </div>
               <div className="h-2 w-full bg-base rounded-full overflow-hidden">
                 <div className="h-full bg-blue-500 rounded-full" style={{ width: `${100 - overview.icuAvailabilityPct}%` }}></div>
               </div>
            </div>
            <div className="text-sm text-text-muted">
               ICU availability is currently at {overview.icuAvailabilityPct}%.
            </div>
          </div>
        </div>
        
        <div className="rounded-card border border-border bg-base-card p-6 flex flex-col min-h-[400px]">
          <h2 className="text-lg font-bold text-text mb-4 flex items-center gap-2">
            <AlertOctagon className="h-5 w-5 text-red-400" />
            Live Medical & Disaster Events
          </h2>
          <div className="flex-1 overflow-hidden relative">
            <div className="absolute inset-0">
               <LiveEventStream filter="HEALTHCARE" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
