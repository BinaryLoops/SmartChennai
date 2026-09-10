"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { motion } from "framer-motion";

interface DeptStatus {
  status: "healthy" | "warning" | "critical";
  reason: string;
}

interface DepartmentStatusStripProps {
  departments: {
    traffic: DeptStatus;
    police: DeptStatus;
    fire: DeptStatus;
    water: DeptStatus;
  };
}

export function DepartmentStatusStrip({ departments }: DepartmentStatusStripProps) {
  const t = useTranslations("executive");

  const deptList = [
    { key: "traffic", data: departments.traffic, href: "/dashboard/traffic" },
    { key: "police", data: departments.police, href: "/dashboard/emergency" },
    { key: "fire", data: departments.fire, href: "/dashboard/emergency" },
    { key: "water", data: departments.water, href: "/dashboard/water" },
  ];

  return (
    <div className="rounded-card border border-border bg-base-card shadow-lg p-5">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-text-primary">
        {t("departmentStatus")}
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {deptList.map((dept) => {
          const isCritical = dept.data.status === "critical";
          const isWarning = dept.data.status === "warning";
          
          let colorClass = "text-accent-green bg-accent-green/10 border-accent-green/20";
          let dotClass = "bg-accent-green";
          if (isCritical) {
            colorClass = "text-accent-red bg-accent-red/10 border-accent-red/50 shadow-[0_0_10px_rgba(239,68,68,0.2)]";
            dotClass = "bg-accent-red";
          } else if (isWarning) {
            colorClass = "text-accent-amber bg-accent-amber/10 border-accent-amber/30";
            dotClass = "bg-accent-amber";
          }

          return (
            <Link key={dept.key} href={dept.href}>
              <div className={`flex flex-col p-4 rounded-lg border transition-all hover:brightness-110 cursor-pointer h-full ${colorClass}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold uppercase tracking-wider text-sm">
                    {t(dept.key)}
                  </span>
                  <div className="relative flex h-3 w-3">
                    {isCritical && (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-red opacity-75"></span>
                    )}
                    <span className={`relative inline-flex rounded-full h-3 w-3 ${dotClass}`}></span>
                  </div>
                </div>
                <div className="mt-auto">
                  <span className="text-[10px] uppercase font-bold tracking-widest opacity-80 block mb-1">
                    {t(`status.${dept.data.status}`)}
                  </span>
                  <span className="text-xs font-mono opacity-90 truncate block">
                    {dept.data.reason}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
