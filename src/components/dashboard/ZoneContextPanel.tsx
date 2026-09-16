import React from "react";
import { useSocket } from "@/hooks/useSocket";
import { useMapFocus } from "@/components/map/MapContext";
import { Card } from "@/components/ui/Card";
import { Activity, Droplets, Leaf, Zap, Trash2, Camera, AlertTriangle } from "lucide-react";
import clsx from "clsx";

export function ZoneContextPanel() {
  const { focus } = useMapFocus();
  const socket = useSocket();
  const zoneName = focus?.zoneName;
  const zoneId = focus?.zoneId;

  if (!zoneId && !zoneName) return null;

  // Filter state for this specific zone
  // A rough approximation if zoneId is not precisely on all elements
  const zoneTraffic = Array.from(socket.trafficByJunction.values()).filter(t => t.zoneId === zoneId || !zoneId);
  const avgCongestion = zoneTraffic.length > 0 ? zoneTraffic.reduce((acc, t) => acc + t.congestionLevel, 0) / zoneTraffic.length : 0;
  const congestedJunctions = zoneTraffic.filter(t => t.congestionLevel > 0.8).length;

  const zoneWater = Array.from(socket.waterBySensor.values()).filter(w => w.zoneId === zoneId || w.sensorName.includes(zoneName || ""));
  const floodAlerts = zoneWater.filter(w => w.riskLevel === "danger" || w.riskLevel === "warning").length;

  const zoneIncidents = socket.incidents.filter(i => (i as any).zoneId === zoneId || !zoneId); // incidents might not have zoneId but we try
  const activeIncidents = zoneIncidents.filter(i => i.status !== "resolved").length;
  
  const now = new Date();
  const timeFormatter = new Intl.DateTimeFormat("en-US", { hour: 'numeric', minute: '2-digit', second: '2-digit' });
  const lastUpdated = timeFormatter.format(now);

  const getMetricColor = (val: number, isGoodLow: boolean = true) => {
    if (val === 0) return "text-text-primary";
    return isGoodLow ? "text-accent-red" : "text-accent-green";
  };

  return (
    <Card className="border-border bg-base-card p-4 shadow-sm flex flex-col gap-3 mt-4">
      <div className="flex items-center justify-between border-b border-border/50 pb-2">
        <div>
          <h3 className="text-sm text-text-secondary uppercase tracking-wider font-semibold">Selected Location</h3>
          <p className="text-lg font-bold text-accent-cyan mt-1">{zoneName || "Unknown Zone"}</p>
          {zoneId && <p className="text-xs text-text-muted">{zoneId}</p>}
        </div>
      </div>

      <div className="space-y-3 mt-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-text-muted" />
            <span className="text-sm font-medium">Traffic</span>
          </div>
          <div className="text-right">
            <span className={clsx("text-sm font-bold", getMetricColor(congestedJunctions))}>
              {Math.round(avgCongestion * 100)}%
            </span>
            {congestedJunctions > 0 && <span className="text-xs text-text-muted ml-2">({congestedJunctions} alerts)</span>}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Droplets className="w-4 h-4 text-text-muted" />
            <span className="text-sm font-medium">Water</span>
          </div>
          <div className="text-right">
            <span className={clsx("text-sm font-bold", getMetricColor(floodAlerts))}>
              {floodAlerts > 0 ? `${floodAlerts} Alerts` : "Normal"}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-text-muted" />
            <span className="text-sm font-medium">Incidents</span>
          </div>
          <div className="text-right">
            <span className={clsx("text-sm font-bold", getMetricColor(activeIncidents))}>
              {activeIncidents > 0 ? `${activeIncidents} Active` : "None"}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-2 pt-2 border-t border-border/50">
        <p className="text-xs text-text-muted text-right">Updated {lastUpdated}</p>
      </div>
    </Card>
  );
}
