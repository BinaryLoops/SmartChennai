"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export function KpiTrendChart() {
  const t = useTranslations("executive");
  const [range, setRange] = useState<"weekly" | "monthly">("weekly");
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasSufficientData, setHasSufficientData] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/dashboard/executive/trends?range=${range}`)
      .then(res => res.json())
      .then(json => {
        setData(json.data || []);
        setHasSufficientData(json.hasSufficientData);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [range]);

  return (
    <div className="flex flex-col rounded-card border border-border bg-base-card p-5 shadow-lg h-[400px]">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-text-primary">
          {t("kpiTrends")}
        </h3>
        <div className="flex bg-base-elevated rounded-lg p-1">
          <button
            onClick={() => setRange("weekly")}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
              range === "weekly" ? "bg-accent-cyan text-base-card" : "text-text-muted hover:text-text-primary"
            }`}
          >
            {t("weekly")}
          </button>
          <button
            onClick={() => setRange("monthly")}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
              range === "monthly" ? "bg-accent-cyan text-base-card" : "text-text-muted hover:text-text-primary"
            }`}
          >
            {t("monthly")}
          </button>
        </div>
      </div>

      <div className="flex-1 relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="skeleton h-full w-full rounded" />
          </div>
        ) : !hasSufficientData ? (
          <div className="absolute inset-0 flex items-center justify-center border border-dashed border-border rounded-lg bg-base-elevated/50">
            <p className="text-sm text-text-muted">{t("insufficientData")}</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis 
                dataKey="date" 
                stroke="#666" 
                fontSize={10} 
                tickFormatter={(val) => val.split("-").slice(1).join("/")} 
              />
              <YAxis stroke="#666" fontSize={10} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1a1a1a",
                  borderColor: "#333",
                  borderRadius: "8px",
                  fontSize: "12px"
                }}
                labelStyle={{ color: "#aaa", marginBottom: "4px" }}
              />
              <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
              
              <Line
                type="monotone"
                dataKey="congestion"
                name={t("congestion")}
                stroke="#ef4444" // red
                strokeWidth={2}
                dot={{ r: 3, fill: "#ef4444" }}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="responseTime"
                name={t("responseTime")}
                stroke="#06b6d4" // cyan
                strokeWidth={2}
                dot={{ r: 3, fill: "#06b6d4" }}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="citizenSat"
                name={t("satisfaction")}
                stroke="#22c55e" // green
                strokeWidth={2}
                dot={{ r: 3, fill: "#22c55e" }}
                strokeDasharray="5 5"
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
