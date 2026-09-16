"use client";

import { useMapFocus } from "./MapContext";
import { useEffect, useState } from "react";
import { X, ExternalLink, ShieldAlert, Activity, CheckCircle2 } from "lucide-react";

export function AssetDetailsPanel() {
  const { focus, setFocus } = useMapFocus();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!focus?.assetId || !focus?.assetType) {
      setData(null);
      return;
    }

    // In a real implementation we would fetch asset details by ID from the server
    // For now, we simulate fetching detailed context based on the asset ID
    setLoading(true);
    const timer = setTimeout(() => {
      setData({
        id: focus.assetId || "unknown",
        type: focus.assetType || "unknown",
        name: `Asset ${(focus.assetId || "unknown").slice(0, 8)}`,
        status: "Operational",
        lastUpdated: new Date().toLocaleTimeString(),
        metrics: {
          uptime: "99.9%",
          activeAlerts: 0
        }
      });
      setLoading(false);
    }, 400);

    return () => clearTimeout(timer);
  }, [focus]);

  if (!focus?.assetId) return null;

  return (
    <div className="absolute top-4 right-4 z-[1000] w-80 rounded-card border border-border bg-base/90 p-4 shadow-xl backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <h3 className="font-semibold text-text-primary">Asset Details</h3>
        <button
          onClick={() => setFocus(null)}
          className="rounded hover:bg-white/10 p-1 text-text-muted transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      <div className="mt-4 space-y-4">
        {loading ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-4 w-2/3 rounded bg-white/10"></div>
            <div className="h-4 w-1/2 rounded bg-white/10"></div>
            <div className="h-20 w-full rounded bg-white/10"></div>
          </div>
        ) : data ? (
          <>
            <div>
              <p className="text-sm font-medium text-text-secondary">Identifier</p>
              <p className="font-mono text-sm text-text-primary">{data.id}</p>
            </div>
            
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-green-500" />
              <span className="text-sm font-medium text-text-primary">{data.status}</span>
            </div>

            <div className="rounded-lg bg-black/20 p-3 text-sm">
              <div className="flex justify-between mb-2">
                <span className="text-text-muted">Location</span>
                <span className="font-medium text-text-primary">{focus.zoneName || "Unknown Zone"}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-text-muted">Type</span>
                <span className="font-medium text-text-primary uppercase">{data.type}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-text-muted">Last Updated</span>
                <span className="font-medium text-text-primary">{data.lastUpdated}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Active Alerts</span>
                <span className="font-medium text-text-primary">{data.metrics.activeAlerts}</span>
              </div>
            </div>

            <div className="pt-2">
              <button className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent-blue/10 py-2 text-sm font-medium text-accent-blue hover:bg-accent-blue/20 transition-colors">
                <ExternalLink size={14} />
                View Full Diagnostics
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
