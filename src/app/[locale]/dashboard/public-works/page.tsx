"use client";

import React from "react";
import useSWR from "swr";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/Card";
import { HardHat, Wrench, Truck, Clock } from "lucide-react";

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function PublicWorksDashboard() {
  const t = useTranslations("dashboard");

  const { data: overview } = useSWR("/api/public-works/overview", fetcher, { refreshInterval: 5000 });
  const { data: workOrders = [] } = useSWR("/api/public-works/work-orders", fetcher, { refreshInterval: 5000 });
  const { data: projects = [] } = useSWR("/api/public-works/projects", fetcher, { refreshInterval: 5000 });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("publicWorks.title")}</h1>
          <p className="text-muted-foreground">{t("publicWorks.subtitle")}</p>
        </div>
        <div className="flex gap-2 items-center">
          <span className="px-2 py-1 text-xs font-semibold bg-blue-500 text-white rounded">
            LIVE DEMO • SIMULATED TELEMETRY
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium">{t("publicWorks.openWorkOrders")}</h3>
            <Wrench className="h-4 w-4 text-blue-500" />
          </div>
          <div>
            <div className="text-2xl font-bold">{overview?.openWorkOrders ?? "-"}</div>
          </div>
        </Card>
        <Card>
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium">{t("publicWorks.activeCrews")}</h3>
            <Truck className="h-4 w-4 text-green-500" />
          </div>
          <div>
            <div className="text-2xl font-bold">{overview?.activeCrews ?? "-"}</div>
          </div>
        </Card>
        <Card>
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium">{t("publicWorks.projectsInProgress")}</h3>
            <HardHat className="h-4 w-4 text-yellow-500" />
          </div>
          <div>
            <div className="text-2xl font-bold">{overview?.projectsInProgress ?? "-"}</div>
            <p className="text-xs text-muted-foreground">{overview?.projectsAtRisk} AT RISK</p>
          </div>
        </Card>
        <Card>
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium">{t("publicWorks.slaRisk")}</h3>
            <Clock className="h-4 w-4 text-red-500" />
          </div>
          <div>
            <div className="text-2xl font-bold">{overview?.slaAtRisk ?? "-"}</div>
            <p className="text-xs text-muted-foreground">{overview?.slaBreached} BREACHED</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="col-span-1">
          <h3 className="text-lg font-semibold mb-4">{t("publicWorks.priorityQueue")}</h3>
          <div className="space-y-4">
            {workOrders.slice(0, 8).map((wo: any) => (
              <div key={wo.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                <div>
                  <p className="text-sm font-medium">{wo.workOrderCode} - {wo.category}</p>
                  <p className="text-xs text-muted-foreground">Asset: {wo.CityAsset?.name || "N/A"}</p>
                  {wo.resolutionNotes && <p className="text-xs text-muted-foreground italic truncate max-w-[200px]">{wo.resolutionNotes}</p>}
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded \${wo.priority === "HIGH" ? "bg-red-500/20 text-red-500" : "bg-secondary text-foreground"}`}>
                    {wo.priority}
                  </span>
                  <p className="text-xs font-semibold">{wo.status}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="col-span-1">
          <h3 className="text-lg font-semibold mb-4">{t("publicWorks.projectPortfolio")}</h3>
          <div className="space-y-4">
            {projects.map((proj: any) => (
              <div key={proj.id} className="space-y-2 border-b pb-4 last:border-0 last:pb-0">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium">{proj.name}</p>
                    <p className="text-xs text-muted-foreground">{proj.projectCode} • {proj.department}</p>
                  </div>
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded \${proj.status === "AT_RISK" || proj.status === "DELAYED" ? "bg-red-500/20 text-red-500" : "bg-secondary text-foreground"}`}>
                    {proj.status}
                  </span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2.5">
                  <div className="bg-primary h-2.5 rounded-full" style={{ width: proj.progressPercent + "%" }}></div>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Progress: {proj.progressPercent.toFixed(1)}%</span>
                  <span>Budget: ₹{(proj.budgetSpent / 100000).toFixed(2)}L / ₹{(proj.budgetPlanned / 100000).toFixed(2)}L</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
