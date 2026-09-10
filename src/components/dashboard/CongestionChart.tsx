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
} from "recharts";
import type { CongestionPoint } from "@/hooks/useSocket";

interface CongestionChartProps {
  data: CongestionPoint[];
}

export function CongestionChart({ data }: CongestionChartProps) {
  const chartData = useMemo(() => {
    return data.map((d) => ({
      ...d,
      time: new Date(d.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    }));
  }, [data]);

  return (
    <div className="h-full w-full rounded-card border border-border bg-base-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-text-primary">
          Congestion Trend (1h)
        </h3>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-accent-cyan" />
          <span className="text-[10px] text-text-muted">Avg %</span>
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="flex h-[calc(100%-2rem)] items-center justify-center text-sm text-text-muted">
          Waiting for data...
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart
            data={chartData}
            margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="congestionGradient" x1="0" y1="0" x2="0" y2="1">
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
              minTickGap={40}
            />
            <YAxis
              tick={{ fill: "#5B6272", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              contentStyle={{
                background: "#151A24",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "8px",
                color: "#E5E7EB",
                fontSize: "12px",
              }}
              labelStyle={{ color: "#8B92A5" }}
              formatter={(value: number) => [`${value}%`, "Congestion"]}
            />
            <Area
              type="monotone"
              dataKey="avgCongestion"
              stroke="#22D3EE"
              strokeWidth={2}
              fill="url(#congestionGradient)"
              animationDuration={300}
              dot={false}
              activeDot={{
                r: 4,
                stroke: "#22D3EE",
                strokeWidth: 2,
                fill: "#151A24",
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export default CongestionChart;
