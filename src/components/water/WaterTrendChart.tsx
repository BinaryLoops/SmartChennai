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
  ReferenceLine,
} from "recharts";
import { useTranslations } from "next-intl";

interface HistoryPoint {
  timestamp: string;
  waterLevel: number;
}

interface WaterTrendChartProps {
  history: HistoryPoint[];
}

export function WaterTrendChart({ history }: WaterTrendChartProps) {
  const t = useTranslations("water");

  const chartData = useMemo(() => {
    if (!history || history.length === 0) return [];
    
    // Downsample if we have too many points (e.g., 720 points for 1 hour at 5s).
    // We can show maybe 60 points max for rendering performance.
    const step = Math.max(1, Math.floor(history.length / 60));
    const sampled = history.filter((_, i) => i % step === 0);

    return sampled.map((d) => ({
      ...d,
      time: new Date(d.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      level: Math.round(d.waterLevel),
    }));
  }, [history]);

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
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="waterGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22D3EE" stopOpacity={0.4} />
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
          />
          <YAxis
            domain={[0, 250]} // MAX_WATER_CM is 250
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
            formatter={(value: number) => [`${value} cm`, t("waterLevel")]}
          />
          <ReferenceLine y={80} stroke="#F59E0B" strokeDasharray="3 3" opacity={0.5} label={{ position: 'insideTopLeft', value: t('warning'), fill: '#F59E0B', fontSize: 10 }} />
          <ReferenceLine y={120} stroke="#F97316" strokeDasharray="3 3" opacity={0.5} label={{ position: 'insideTopLeft', value: t('critical'), fill: '#F97316', fontSize: 10 }} />
          <ReferenceLine y={160} stroke="#EF4444" strokeDasharray="3 3" opacity={0.5} label={{ position: 'insideTopLeft', value: t('flood'), fill: '#EF4444', fontSize: 10 }} />
          <Area
            type="monotone"
            dataKey="level"
            stroke="#22D3EE"
            strokeWidth={2}
            fill="url(#waterGradient)"
            animationDuration={300}
            dot={false}
            activeDot={{ r: 4, stroke: "#22D3EE", strokeWidth: 2, fill: "#151A24" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default WaterTrendChart;
