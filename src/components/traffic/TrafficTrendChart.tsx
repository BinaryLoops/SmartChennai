"use client";

import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Line,
} from "recharts";
import { useTranslations } from "next-intl";

interface HistoryPoint {
  timestamp: string;
  vehiclesPerHour: number;
}

interface TrafficTrendChartProps {
  history: HistoryPoint[];
}

export function TrafficTrendChart({ history, predictions = [] }: TrafficTrendChartProps & { predictions?: any[] }) {
  const t = useTranslations("traffic");

  const chartData = useMemo(() => {
    if (!history || history.length === 0) return [];

    const data = history.map((d) => ({
      ...d,
      time: new Date(d.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      vph: d.vehiclesPerHour,
      predicted: null as number | null,
    }));

    // Next 30-minute Prediction logic:
    // We now use external FastAPI predictions passed via props
    if (predictions && predictions.length > 0) {
      const lastPoint = data[data.length - 1];
      
      for (const p of predictions) {
        data.push({
          timestamp: p.timestamp,
          vehiclesPerHour: 0,
          time: new Date(p.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          vph: 0, // Keep 0 so main area doesn't render here
          predicted: p.predictedVph,
        });
      }
      
      // To connect the lines, we must also set `predicted` on the last actual point
      data[data.length - predictions.length - 1].predicted = lastPoint.vph;
    }

    return data;
  }, [history, predictions]);

  if (chartData.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-text-muted">
        {t("noData")}
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={chartData}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="trafficGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22D3EE" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#22D3EE" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.04)"
            vertical={false}
          />
          <XAxis
            dataKey="time"
            tick={{ fill: "#5B6272", fontSize: 10 }}
            axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={60}
          />
          <YAxis
            tick={{ fill: "#5B6272", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "#151A24",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "8px",
              color: "#E5E7EB",
              fontSize: "12px",
            }}
            labelStyle={{ color: "#8B92A5", marginBottom: "4px" }}
            formatter={(value: number, name: string) => {
              if (value === 0) return [null, null]; // Hide 0s
              const label = name === "vph" ? t("vph") : t("predicted");
              return [value, label];
            }}
          />
          <Area
            type="monotone"
            dataKey="vph"
            stroke="#22D3EE"
            strokeWidth={2}
            fill="url(#trafficGradient)"
            animationDuration={300}
            dot={false}
            activeDot={{ r: 4, stroke: "#22D3EE", strokeWidth: 2, fill: "#151A24" }}
          />
          <Line
            type="monotone"
            dataKey="predicted"
            stroke="#F59E0B"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            activeDot={{ r: 4, stroke: "#F59E0B", strokeWidth: 2, fill: "#151A24" }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export default TrafficTrendChart;
