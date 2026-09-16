"use client";
import { Radio } from "lucide-react";

export function DemoIndicator() {
  return (
    <div className="flex items-center gap-2 text-xs font-bold text-amber-500 bg-amber-500/10 px-3 py-1 rounded-full animate-pulse border border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
      <Radio size={14} />
      LIVE DEMO • SIMULATED TELEMETRY
    </div>
  );
}