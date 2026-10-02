"use client";

import { useTranslations } from "next-intl";
import { Topbar } from "@/components/layout/Topbar";
import { LiveEventStream } from "@/components/dashboard/extended/LiveEventStream";
import dynamic from "next/dynamic";
import { KpiCard } from "@/components/ui/KpiCard";
import useSWR from "swr";
import { Bus, Clock, Users, CheckCircle } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Disable SSR for Map
const MapWithNoSSR = dynamic(() => import("@/components/dashboard/ChennaiMap"), { ssr: false });

export default function TransitDashboard() {
  const t = useTranslations("dashboard");
  const tT = useTranslations("transit");

  const { data } = useSWR("/api/transit/overview", fetcher, { refreshInterval: 5000 });

  return (
    <div className="flex flex-col h-screen">
      <Topbar />
      
      {/* KPI Header */}
      <div className="flex flex-wrap gap-4 p-4 border-b border-white/10 bg-black/20">
        <KpiCard
          label={tT("activeVehicles")}
          value={data?.activeVehicles || 0}
          accent="cyan"
          suffix=""
        />
        <KpiCard
          label={tT("averageDelay")}
          value={data?.averageDelay ? Math.round(data.averageDelay) : 0}
          accent="amber"
          suffix=" min"
        />
        <KpiCard
          label={tT("overCapacity")}
          value={data?.overCapacityVehicles || 0}
          accent="red"
          suffix=""
        />
        <KpiCard
          label={tT("serviceReliability")}
          value={data?.serviceReliability ? Math.round(data.serviceReliability) : 0}
          accent="green"
          suffix=" %"
        />
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Map Area */}
        <div className="flex-1 relative">
          <MapWithNoSSR zones={[]} junctions={[]} cameras={[]} incidents={[]} trafficByJunction={new Map()} />
          <div className="absolute top-4 left-4 z-[400] bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-xs font-mono text-white/70">
            <span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-pulse mr-2" />
            LIVE DEMO • SIMULATED TRANSIT TELEMETRY
          </div>
        </div>

        {/* Right Sidebar - Priority Operations & Context */}
        <div className="w-[420px] bg-black/40 backdrop-blur-xl border-l border-white/10 flex flex-col p-4 space-y-6 overflow-y-auto">
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-white tracking-tight">{tT("priorityOperations")}</h2>
            <p className="text-sm text-gray-400">
              {tT("disruptionsQueue")}
            </p>
          </div>
          
          <LiveEventStream filterType="TRANSIT" />
        </div>
      </div>
    </div>
  );
}
