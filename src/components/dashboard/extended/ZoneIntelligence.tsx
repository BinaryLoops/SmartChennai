"use client";
import { useEffect, useState } from "react";
import { Activity } from "lucide-react";

export function ZoneIntelligence() {
  const [health, setHealth] = useState("HEALTHY");

  useEffect(() => {
    // Basic simulation logic based on events or static for demo.
    // In a real hook, this would listen to the socket and aggregate zone health.
    const statuses = ["HEALTHY", "HEALTHY", "DEGRADED", "HEALTHY"];
    const interval = setInterval(() => {
      setHealth(statuses[Math.floor(Math.random() * statuses.length)]);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const color = health === "HEALTHY" ? "text-emerald-400 bg-emerald-400/10" 
              : health === "DEGRADED" ? "text-amber-400 bg-amber-400/10" 
              : "text-red-400 bg-red-400/10";

  return (
    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border border-white/5 ${color}`}>
      <Activity size={14} />
      CITY STATUS: {health}
    </div>
  );
}