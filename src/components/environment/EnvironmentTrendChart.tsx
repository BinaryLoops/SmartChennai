"use client";

import { useTranslations } from "next-intl";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

interface HistoryPoint {
  timestamp: string;
  aqi: number;
}

interface TrendProps {
  history: HistoryPoint[];
}

export function EnvironmentTrendChart({ history }: TrendProps) {
  const t = useTranslations("environment");

  const formattedData = history.map((d) => {
    const date = new Date(d.timestamp);
    return {
      time: date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      aqi: d.aqi,
    };
  });

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="colorAqi" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#22D3EE" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#22D3EE" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
        <XAxis 
          dataKey="time" 
          tick={{ fontSize: 10, fill: "#94A3B8" }}
          tickMargin={10}
          axisLine={false}
          tickLine={false}
          minTickGap={30}
        />
        <YAxis 
          tick={{ fontSize: 10, fill: "#94A3B8" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#1E293B",
            border: "1px solid #334155",
            borderRadius: "0.5rem",
            fontSize: "12px"
          }}
          itemStyle={{ color: "#22D3EE" }}
        />
        <Area
          type="monotone"
          dataKey="aqi"
          stroke="#22D3EE"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorAqi)"
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export default EnvironmentTrendChart;
