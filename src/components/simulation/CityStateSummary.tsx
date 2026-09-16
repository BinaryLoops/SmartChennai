"use client";

import { useSocket } from "@/hooks/useSocket";
import { Activity, Clock, ServerCrash, CheckCircle } from "lucide-react";

export function CityStateSummary() {
  const { scenarioState } = useSocket();

  if (!scenarioState) {
    return (
      <div className="bg-white dark:bg-[#1a1b1e] rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 animate-pulse">
        <div className="h-4 w-32 bg-gray-200 dark:bg-gray-800 rounded mb-4"></div>
        <div className="space-y-3">
          <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded"></div>
          <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded"></div>
        </div>
      </div>
    );
  }

  const formatModifier = (val: number) => {
    const pct = Math.round(val * 100);
    if (pct > 0) return <span className="text-red-500 font-medium">+{pct}%</span>;
    if (pct < 0) return <span className="text-emerald-500 font-medium">{pct}%</span>;
    return <span className="text-gray-400">0%</span>;
  };

  return (
    <div className="bg-white dark:bg-[#1a1b1e] rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <Activity className="w-4 h-4 text-indigo-500" />
          Live Causal State
        </h3>
        {scenarioState.status !== "idle" && (
          <div className="text-xs text-gray-500 flex items-center gap-1 font-mono">
            <Clock className="w-3 h-3" />
            T+ {Math.floor(scenarioState.elapsedSeconds)}s
          </div>
        )}
      </div>
      
      <div className="p-4 grid grid-cols-2 gap-4 flex-none">
        <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <div className="text-xs text-gray-500 mb-1">Traffic Impact</div>
          <div className="text-lg">{formatModifier(scenarioState.currentModifiers.trafficFriction)}</div>
        </div>
        <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <div className="text-xs text-gray-500 mb-1">Flood Risk</div>
          <div className="text-lg">{formatModifier(scenarioState.currentModifiers.floodRiskMultiplier)}</div>
        </div>
        <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <div className="text-xs text-gray-500 mb-1">Emergency Demand</div>
          <div className="text-lg">{formatModifier(scenarioState.currentModifiers.emergencyDemandMultiplier)}</div>
        </div>
        <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <div className="text-xs text-gray-500 mb-1">Grid Availability</div>
          <div className="text-lg">
            <span className={scenarioState.currentModifiers.powerGridAvailability < 1 ? "text-red-500 font-medium" : "text-emerald-500"}>
              {Math.round(scenarioState.currentModifiers.powerGridAvailability * 100)}%
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto border-t border-gray-100 dark:border-gray-800 p-4">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Causal Timeline</h4>
        {scenarioState.history.length === 0 ? (
          <div className="text-center text-gray-400 text-sm py-4">No recent causal events</div>
        ) : (
          <div className="space-y-3">
            {scenarioState.history.map((entry, i) => (
              <div key={entry.id} className="flex gap-3 relative">
                {/* Timeline line */}
                {i < scenarioState.history.length - 1 && (
                  <div className="absolute left-2 top-6 bottom-[-16px] w-[2px] bg-gray-100 dark:bg-gray-800" />
                )}
                
                <div className="relative z-10 mt-1">
                  {entry.type === "start" && <div className="w-4 h-4 rounded-full bg-red-100 border-2 border-red-500" />}
                  {entry.type === "stop" && <div className="w-4 h-4 rounded-full bg-amber-100 border-2 border-amber-500" />}
                  {entry.type === "effect" && <div className="w-4 h-4 rounded-full bg-indigo-100 border-2 border-indigo-500" />}
                  {entry.type === "recovery" && <CheckCircle className="w-4 h-4 text-emerald-500 bg-white" />}
                </div>
                
                <div className="flex-1 pb-1">
                  <div className="text-[10px] text-gray-500 font-mono mb-0.5">
                    {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </div>
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    {entry.message}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
