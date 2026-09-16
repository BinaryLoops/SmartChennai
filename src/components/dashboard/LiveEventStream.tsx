"use client";

import { useSocket } from "@/hooks/useSocket";
import { AlertCircle, AlertTriangle, Info, ShieldAlert, CheckCircle2 } from "lucide-react";
import { useMapFocus } from "../map/MapContext";

export function LiveEventStream() {
  const { cityEvents } = useSocket();
  const { setFocus } = useMapFocus();

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return <ShieldAlert className="w-4 h-4 text-red-500" />;
      case "HIGH":
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case "MEDIUM":
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case "LOW":
        return <Info className="w-4 h-4 text-blue-500" />;
      case "NORMAL":
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      default:
        return <Info className="w-4 h-4 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return "text-red-600 bg-red-100 dark:bg-red-900/30";
      case "HIGH":
        return "text-orange-600 bg-orange-100 dark:bg-orange-900/30";
      case "MEDIUM":
        return "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30";
      case "LOW":
        return "text-blue-600 bg-blue-100 dark:bg-blue-900/30";
      case "NORMAL":
        return "text-green-600 bg-green-100 dark:bg-green-900/30";
      default:
        return "text-gray-600 bg-gray-100 dark:bg-gray-800";
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#1a1b1e] rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">Live City Events</h3>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">LIVE</span>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
        {cityEvents.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <Info className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">No recent events</p>
          </div>
        ) : (
          <div className="space-y-2">
            {cityEvents.map((event) => (
              <div 
                key={event.id}
                onClick={() => {
                  const lat = event.metadata?.lat as number | undefined;
                  const lng = event.metadata?.lng as number | undefined;
                  if (lat && lng) {
                    setFocus({
                      lat,
                      lng,
                      zoom: 15,
                      assetId: event.id,
                      assetType: event.type
                    });
                  }
                }}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border border-transparent hover:border-gray-100 dark:hover:border-gray-700 cursor-pointer"
              >
                <div className="mt-0.5">
                  {getSeverityIcon(event.severity)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded-sm uppercase ${getSeverityColor(event.severity)}`}>
                        {event.type} {event.zoneName ? `· ${event.zoneName}` : ""}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-500 font-mono whitespace-nowrap">
                      {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                  {event.assetId && (
                    <p className="text-[11px] font-mono text-gray-500 mb-0.5">{event.assetId}</p>
                  )}
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {event.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
