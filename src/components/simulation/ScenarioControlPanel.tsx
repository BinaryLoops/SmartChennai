"use client";

import { useSocket } from "@/hooks/useSocket";
import { SOCKET_EVENTS } from "@packages/types";
import { ScenarioCommandPayload, ScenarioId } from "@packages/types/scenarios";
import { Play, Square, Pause, RotateCcw, AlertTriangle } from "lucide-react";
import { useState } from "react";

const SCENARIOS: { id: ScenarioId; name: string; description: string }[] = [
  { id: "NORMAL_DAY", name: "Normal Day", description: "Baseline city operations with normal fluctuations." },
  { id: "HEAVY_RAIN", name: "Heavy Rain", description: "Prolonged heavy rainfall increasing drainage load." },
  { id: "URBAN_FLOOD", name: "Urban Flood", description: "Severe flooding inundating critical infrastructure." },
  { id: "MAJOR_TRAFFIC_ACCIDENT", name: "Major Traffic Accident", description: "A major collision on a key arterial route." },
  { id: "POWER_OUTAGE", name: "Power Outage", description: "Grid failure impacting streetlights and signals." },
  { id: "WATER_PIPELINE_FAILURE", name: "Water Pipeline Failure", description: "Main pipeline burst causing localized flooding." },
  { id: "LARGE_PUBLIC_EVENT", name: "Large Public Event", description: "Festival or rally increasing crowd density." },
  { id: "EXTREME_HEAT", name: "Extreme Heat", description: "Heatwave increasing power demand and health risks." },
  { id: "MULTI_INCIDENT", name: "Multi-Incident Crisis", description: "Compounding crises stressing all city services." },
  { id: "RECOVERY_MODE", name: "Recovery Mode", description: "Accelerated recovery from a previous crisis." },
];

export function ScenarioControlPanel() {
  const { scenarioState, emit } = useSocket();
  const [selectedScenario, setSelectedScenario] = useState<ScenarioId>("HEAVY_RAIN");
  const [severity, setSeverity] = useState<number>(1.0);

  const handleCommand = (action: ScenarioCommandPayload["action"]) => {
    emit(SOCKET_EVENTS.scenarioCommand, {
      action,
      scenarioId: action === "start" ? selectedScenario : undefined,
      severity,
    } as ScenarioCommandPayload);
  };

  const active = scenarioState?.status === "active";
  const paused = scenarioState?.status === "pause";
  const recovering = scenarioState?.status === "recovering";

  return (
    <div className="bg-white dark:bg-[#1a1b1e] rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
      <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-100 dark:border-gray-800">
        <AlertTriangle className="w-5 h-5 text-indigo-500" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Scenario Control</h2>
        {active && <span className="ml-auto px-2 py-1 text-xs font-bold bg-red-100 text-red-700 rounded animate-pulse">ACTIVE</span>}
        {recovering && <span className="ml-auto px-2 py-1 text-xs font-bold bg-amber-100 text-amber-700 rounded animate-pulse">RECOVERING</span>}
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select Scenario</label>
          <select 
            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            value={selectedScenario}
            onChange={(e) => setSelectedScenario(e.target.value as ScenarioId)}
            disabled={active || recovering}
          >
            {SCENARIOS.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            {SCENARIOS.find(s => s.id === selectedScenario)?.description}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Severity Target ({Math.round(severity * 100)}%)
          </label>
          <input 
            type="range" 
            min="0.1" 
            max="1.0" 
            step="0.1" 
            value={severity}
            onChange={(e) => setSeverity(parseFloat(e.target.value))}
            className="w-full accent-indigo-600"
            disabled={active || recovering}
          />
        </div>

        <div className="flex items-center gap-2 pt-2">
          {(!active && !paused) ? (
            <button 
              onClick={() => handleCommand("start")}
              disabled={recovering}
              className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              <Play className="w-4 h-4" /> Start Scenario
            </button>
          ) : (
            <>
              {paused ? (
                <button 
                  onClick={() => handleCommand("resume")}
                  className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <Play className="w-4 h-4" /> Resume
                </button>
              ) : (
                <button 
                  onClick={() => handleCommand("pause")}
                  className="flex-1 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <Pause className="w-4 h-4" /> Pause
                </button>
              )}
              <button 
                onClick={() => handleCommand("stop")}
                className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <Square className="w-4 h-4" /> Stop & Recover
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
