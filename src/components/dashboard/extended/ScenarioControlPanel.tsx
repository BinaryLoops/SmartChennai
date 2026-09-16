"use client";
import { useState } from "react";
import { Settings2, Play, Pause, RefreshCw, X, ChevronUp, ChevronDown } from "lucide-react";

export function ScenarioControlPanel() {
  const [collapsed, setCollapsed] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [scenario, setScenario] = useState("normal");
  const [loading, setLoading] = useState(false);

  const applySettings = async (newSpeed: number, newScenario: string) => {
    setLoading(true);
    setSpeed(newSpeed);
    setScenario(newScenario);
    try {
      await fetch('/api/dashboard/scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ speed: newSpeed, scenario: newScenario })
      });
    } catch(e) {
      console.error(e);
    }
    setLoading(false);
  };

  if (collapsed) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button onClick={() => setCollapsed(false)} className="bg-slate-900/90 border border-slate-700 p-3 rounded-card text-white shadow-xl hover:bg-slate-800 transition-colors flex items-center gap-2 backdrop-blur-md">
          <Settings2 size={16} className="text-purple-400" />
          <span className="text-xs font-semibold">Scenario Controls</span>
          <ChevronUp size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-72 bg-slate-900/95 border border-slate-700 rounded-card shadow-2xl flex flex-col overflow-hidden backdrop-blur-md transition-all">
      <div className="flex justify-between items-center p-3 border-b border-slate-800 bg-slate-800/50">
        <div className="flex items-center gap-2">
          <Settings2 size={16} className="text-purple-400" />
          <span className="text-xs font-semibold text-white">Scenario Engine</span>
        </div>
        <button onClick={() => setCollapsed(true)} className="text-slate-400 hover:text-white">
          <ChevronDown size={16} />
        </button>
      </div>
      
      <div className="p-4 flex flex-col gap-4 text-sm">
        <div>
          <label className="text-xs text-slate-400 font-semibold mb-2 block">Simulation Speed</label>
          <div className="flex gap-2">
            {[1, 5, 10, 30].map(s => (
              <button 
                key={s}
                onClick={() => applySettings(s, scenario)}
                disabled={loading}
                className={`flex-1 py-1 rounded text-xs font-bold transition-colors ${speed === s ? 'bg-purple-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-slate-400 font-semibold mb-2 block">Trigger Scenario</label>
          <select 
            value={scenario}
            onChange={(e) => applySettings(speed, e.target.value)}
            disabled={loading}
            className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-xs text-white focus:outline-none focus:border-purple-500"
          >
            <option value="normal">Normal Day</option>
            <option value="Heavy Rain">Heavy Rain & Flood Risk</option>
            <option value="Traffic Surge">Traffic Surge</option>
            <option value="Crowd Surge">Crowd Surge</option>
          </select>
        </div>

        <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
          <span className="text-xs text-slate-500">Live Simulator Core</span>
          <button 
            onClick={() => applySettings(1, "normal")}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white"
          >
            <RefreshCw size={12} /> Reset
          </button>
        </div>
      </div>
    </div>
  );
}