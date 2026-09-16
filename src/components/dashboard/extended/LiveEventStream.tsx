"use client";
import { useEffect, useState } from "react";
import { ChevronUp, ChevronDown, Activity, AlertTriangle, Droplets, Car } from "lucide-react";
import { io } from "socket.io-client";

export function LiveEventStream() {
  const [collapsed, setCollapsed] = useState(false);
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    // Fetch initial history
    fetch('/api/dashboard/events')
      .then(r => r.json())
      .then(data => {
        if(data.events) setEvents(data.events);
      })
      .catch(e => console.error("Event fetch error", e));

    const socket = io("http://localhost:4001");
    socket.on("cityEvent:new", (ev: any) => {
      setEvents(prev => [ev, ...prev].slice(0, 50)); // Keep last 50
    });
    return () => { socket.disconnect(); };
  }, []);

  const getIcon = (type: string) => {
    switch(type) {
      case 'TRAFFIC': return <Car size={14} className="text-amber-400" />;
      case 'WATER': return <Droplets size={14} className="text-blue-400" />;
      case 'ENVIRONMENT': return <Activity size={14} className="text-emerald-400" />;
      default: return <AlertTriangle size={14} className="text-red-400" />;
    }
  };

  if (collapsed) {
    return (
      <div className="fixed bottom-4 left-4 z-50">
        <button onClick={() => setCollapsed(false)} className="bg-slate-900/90 border border-slate-700 p-3 rounded-card text-white shadow-xl hover:bg-slate-800 transition-colors flex items-center gap-2 backdrop-blur-md">
          <Activity size={16} className="text-cyan-400" />
          <span className="text-xs font-semibold">Live Event Stream</span>
          <ChevronUp size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 w-80 bg-slate-900/95 border border-slate-700 rounded-card shadow-2xl flex flex-col overflow-hidden backdrop-blur-md transition-all h-96">
      <div className="flex justify-between items-center p-3 border-b border-slate-800 bg-slate-800/50">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-cyan-400" />
          <span className="text-xs font-semibold text-white">Live Event Stream</span>
        </div>
        <button onClick={() => setCollapsed(true)} className="text-slate-400 hover:text-white">
          <ChevronDown size={16} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {events.length === 0 ? (
          <p className="text-xs text-slate-500 text-center mt-4">Waiting for telemetry...</p>
        ) : (
          events.map((ev, i) => (
            <div key={ev.id || i} className="p-2 rounded bg-slate-800/50 border border-slate-700/50 flex flex-col gap-1 hover:bg-slate-800 transition-colors text-xs animate-in slide-in-from-left-2">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2 font-semibold text-slate-300">
                  {getIcon(ev.type)}
                  {ev.type}
                </div>
                <span className="text-slate-500">{new Date(ev.timestamp).toLocaleTimeString()}</span>
              </div>
              <p className="text-slate-400">{ev.description}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}