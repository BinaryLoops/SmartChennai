"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useSocket } from "@/hooks/useSocket";
import { CityHealthGauge } from "@/components/executive/CityHealthGauge";
import { ZoneHealthGrid } from "@/components/executive/ZoneHealthGrid";
import { DepartmentStatusStrip } from "@/components/executive/DepartmentStatusStrip";
import { EscalationFeed } from "@/components/executive/EscalationFeed";
import { KpiTrendChart } from "@/components/executive/KpiTrendChart";
import { PageTransition } from "@/components/layout/PageTransition";

export default function ExecutiveDashboard() {
  const t = useTranslations("executive");
  const socket = useSocket();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/executive");
      if (!res.ok) throw new Error("Unauthorized or server error");
      const json = await res.json();
      setData(json);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Live updates
  useEffect(() => {
    if (socket.latestIncident) {
      fetchData(); // Simplest robust way to refresh aggregated executive metrics
    }
  }, [socket.latestIncident, fetchData]);

  useEffect(() => {
    if (socket.waterBySensor) {
      // we could debounce this if it updates too frequently
      // fetchData(); 
    }
  }, [socket.waterBySensor, fetchData]);

  const handleExportPDF = () => {
    window.print();
  };

  if (loading || !data) {
    return (
      <div className="flex h-full min-h-[500px] items-center justify-center">
        <div className="skeleton h-[400px] w-full max-w-5xl rounded-card" />
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="flex flex-col gap-6 max-w-[1400px] mx-auto pb-10 print:m-0 print:p-0 print:max-w-none print:w-[210mm]">
        
        {/* Header Strip */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4 print:border-none print:pb-2">
          <div>
            <h1 className="text-2xl font-bold text-text-primary uppercase tracking-wider">
              {t("dashboardTitle")}
            </h1>
            <p className="text-sm text-text-muted mt-1">
              {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <button
            onClick={handleExportPDF}
            className="rounded bg-accent-cyan px-4 py-2 text-sm font-bold text-base-card transition-colors hover:bg-cyan-400 print:hidden"
          >
            {t("exportPdf")}
          </button>
        </div>

        {/* Top Row: Gauge & Zone Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 print:col-span-1">
            <CityHealthGauge score={data.cityHealthScore} />
          </div>
          <div className="lg:col-span-2 print:col-span-2">
            <ZoneHealthGrid zones={data.zoneScores} />
          </div>
        </div>

        {/* Middle Row: Dept Status Strip */}
        <div>
          <DepartmentStatusStrip departments={data.departments} />
        </div>

        {/* Bottom Row: Feed & Trends */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <EscalationFeed escalations={data.escalations} />
          </div>
          <div className="lg:col-span-2 print:h-[300px]">
            <KpiTrendChart />
          </div>
        </div>
        
        {/* Print Only Summary Footer */}
        <div className="hidden print:block mt-8 border-t border-border pt-4 text-xs text-text-muted">
          Smart Chennai ICCC — System Generated Executive Report — Page 1 of 1
        </div>
      </div>
    </PageTransition>
  );
}
