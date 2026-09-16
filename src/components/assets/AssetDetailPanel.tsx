"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, MapPin, Activity, Clock, Shield, Radio,
  AlertTriangle, Info, Layers, Wifi, WifiOff,
} from "lucide-react";
import clsx from "clsx";
import type { CityAssetDetail } from "@packages/types/assets";
import {
  CATEGORY_ICONS, CATEGORY_LABELS, ASSET_TYPE_LABELS, STATUS_COLORS,
} from "@packages/types/assets";
import { AssetStatusBadge } from "./AssetStatusBadge";

interface AssetDetailPanelProps {
  assetId: string | null;
  onClose: () => void;
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return "Not available";
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 5) return "Just now";
  if (s < 60) return `${s} sec ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  return new Date(dateStr).toLocaleDateString();
}

function freshnessBadge(dateStr: string | null) {
  if (!dateStr) return { label: "UNKNOWN", color: "text-text-muted bg-text-muted/10 border-text-muted/20" };
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 30)  return { label: "LIVE",   color: "text-accent-green bg-accent-green/10 border-accent-green/30 animate-pulse" };
  if (s < 120) return { label: "RECENT", color: "text-accent-cyan  bg-accent-cyan/10  border-accent-cyan/30" };
  if (s < 600) return { label: "STALE",  color: "text-accent-amber bg-accent-amber/10 border-accent-amber/30" };
  return { label: "OFFLINE", color: "text-accent-red bg-accent-red/10 border-accent-red/30" };
}

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-2.5">
      <span className="text-xs text-text-muted shrink-0 w-28">{label}</span>
      <span className="text-xs text-text-primary text-right">{value ?? "Not available"}</span>
    </div>
  );
}

function LiveDataSection({ liveData }: { liveData: Record<string, any> | null }) {
  if (!liveData) return null;
  const type = liveData.type;

  const renderContent = () => {
    switch (type) {
      case "cctv":
        return (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-base-elevated p-3 border border-border">
              <p className="text-xs text-text-muted mb-1">Feed Status</p>
              <p className={clsx("text-sm font-semibold", liveData.feedStatus === "online" ? "text-accent-green" : "text-accent-red")}>
                {liveData.feedStatus?.toUpperCase()}
              </p>
            </div>
            <div className="rounded-lg bg-base-elevated p-3 border border-border">
              <p className="text-xs text-text-muted mb-1">Last Event</p>
              <p className="text-sm font-semibold text-text-primary">{liveData.lastEvent ?? "None"}</p>
            </div>
          </div>
        );

      case "water_sensor":
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-base-elevated p-3 border border-border">
                <p className="text-xs text-text-muted mb-1">Water Level</p>
                <p className={clsx(
                  "text-lg font-bold",
                  liveData.riskLevel === "danger"  ? "text-accent-red"   :
                  liveData.riskLevel === "warning" ? "text-accent-amber" :
                  liveData.riskLevel === "watch"   ? "text-yellow-400"   : "text-accent-green"
                )}>
                  {liveData.waterLevelCm?.toFixed(1)} cm
                </p>
              </div>
              <div className="rounded-lg bg-base-elevated p-3 border border-border">
                <p className="text-xs text-text-muted mb-1">Risk Level</p>
                <p className={clsx(
                  "text-sm font-bold uppercase",
                  liveData.riskLevel === "danger"  ? "text-accent-red"   :
                  liveData.riskLevel === "warning" ? "text-accent-amber" :
                  liveData.riskLevel === "watch"   ? "text-yellow-400"   : "text-accent-green"
                )}>
                  {liveData.riskLevel}
                </p>
              </div>
            </div>
            {/* Threshold bar */}
            {liveData.thresholds && (
              <div>
                <div className="flex justify-between text-[10px] text-text-muted mb-1">
                  <span>0</span>
                  <span>Watch {liveData.thresholds.watch}cm</span>
                  <span>Warn {liveData.thresholds.warning}cm</span>
                  <span>Danger {liveData.thresholds.danger}cm</span>
                </div>
                <div className="h-2 w-full rounded-full bg-base-elevated overflow-hidden">
                  <div
                    className={clsx(
                      "h-full rounded-full transition-all",
                      liveData.riskLevel === "danger"  ? "bg-accent-red"   :
                      liveData.riskLevel === "warning" ? "bg-accent-amber" :
                      liveData.riskLevel === "watch"   ? "bg-yellow-400"   : "bg-accent-green"
                    )}
                    style={{ width: `${Math.min(100, (liveData.waterLevelCm / liveData.thresholds.danger) * 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        );

      case "junction":
        return (
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-base-elevated p-3 border border-border text-center">
              <p className="text-xs text-text-muted mb-1">Congestion</p>
              <p className={clsx("text-lg font-bold",
                liveData.congestionLevel > 0.8 ? "text-accent-red" :
                liveData.congestionLevel > 0.6 ? "text-accent-amber" : "text-accent-green"
              )}>
                {Math.round((liveData.congestionLevel ?? 0) * 100)}%
              </p>
            </div>
            <div className="rounded-lg bg-base-elevated p-3 border border-border text-center">
              <p className="text-xs text-text-muted mb-1">Vehicles/h</p>
              <p className="text-lg font-bold text-text-primary">{(liveData.vehiclesPerHour ?? 0).toLocaleString()}</p>
            </div>
            <div className="rounded-lg bg-base-elevated p-3 border border-border text-center">
              <p className="text-xs text-text-muted mb-1">Avg Speed</p>
              <p className="text-lg font-bold text-accent-cyan">{Math.round(liveData.avgSpeedKph ?? 0)} km/h</p>
            </div>
          </div>
        );

      case "emergency_unit":
        return (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-base-elevated p-3 border border-border">
              <p className="text-xs text-text-muted mb-1">Availability</p>
              <p className={clsx("text-sm font-bold", liveData.isAvailable ? "text-accent-green" : "text-accent-amber")}>
                {liveData.isAvailable ? "AVAILABLE" : "DISPATCHED"}
              </p>
            </div>
            <div className="rounded-lg bg-base-elevated p-3 border border-border">
              <p className="text-xs text-text-muted mb-1">Unit Type</p>
              <p className="text-sm font-semibold text-text-primary capitalize">{liveData.unitType?.replace("_", " ")}</p>
            </div>
          </div>
        );

      case "env_sensor":
        return (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-base-elevated p-3 border border-border">
              <p className="text-xs text-text-muted mb-1">AQI</p>
              <p className={clsx("text-lg font-bold",
                liveData.aqi > 200 ? "text-accent-red" : liveData.aqi > 100 ? "text-accent-amber" : "text-accent-green"
              )}>
                {liveData.aqi}
              </p>
            </div>
            <div className="rounded-lg bg-base-elevated p-3 border border-border">
              <p className="text-xs text-text-muted mb-1">PM2.5</p>
              <p className="text-lg font-bold text-text-primary">{liveData.pm25?.toFixed(1)} μg/m³</p>
            </div>
            <div className="rounded-lg bg-base-elevated p-3 border border-border">
              <p className="text-xs text-text-muted mb-1">Temperature</p>
              <p className="text-lg font-bold text-accent-amber">{liveData.temperature?.toFixed(1)}°C</p>
            </div>
            <div className="rounded-lg bg-base-elevated p-3 border border-border">
              <p className="text-xs text-text-muted mb-1">Humidity</p>
              <p className="text-lg font-bold text-blue-400">{liveData.humidity?.toFixed(1)}%</p>
            </div>
          </div>
        );

      case "garbage_bin":
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted">Fill Level</span>
              <span className={clsx("text-sm font-bold",
                liveData.fillPercentage > 90 ? "text-accent-red" :
                liveData.fillPercentage > 70 ? "text-accent-amber" : "text-accent-green"
              )}>
                {liveData.fillPercentage}%
              </span>
            </div>
            <div className="h-3 w-full rounded-full bg-base-elevated overflow-hidden">
              <div
                className={clsx("h-full rounded-full transition-all",
                  liveData.fillPercentage > 90 ? "bg-accent-red" :
                  liveData.fillPercentage > 70 ? "bg-accent-amber" : "bg-accent-green"
                )}
                style={{ width: `${liveData.fillPercentage}%` }}
              />
            </div>
          </div>
        );

      case "public_vehicle":
        return (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-base-elevated p-3 border border-border">
              <p className="text-xs text-text-muted mb-1">Speed</p>
              <p className="text-lg font-bold text-accent-cyan">{Math.round(liveData.speed ?? 0)} km/h</p>
            </div>
            <div className="rounded-lg bg-base-elevated p-3 border border-border">
              <p className="text-xs text-text-muted mb-1">Occupancy</p>
              <p className="text-lg font-bold text-text-primary">{liveData.occupancy}%</p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const content = renderContent();
  if (!content) return null;

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3 flex items-center gap-1.5">
        <Activity size={12} className="text-accent-cyan" />
        Live Telemetry
      </p>
      {content}
    </div>
  );
}

export function AssetDetailPanel({ assetId, onClose }: AssetDetailPanelProps) {
  const [asset, setAsset] = useState<CityAssetDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!assetId) { setAsset(null); return; }
    setLoading(true);
    fetch(`/api/assets/${assetId}`)
      .then(r => r.json())
      .then(data => { setAsset(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [assetId]);

  // Poll for live updates every 15 seconds
  useEffect(() => {
    if (!assetId) return;
    const timer = setInterval(() => {
      fetch(`/api/assets/${assetId}`)
        .then(r => r.json())
        .then(data => setAsset(data))
        .catch(() => {});
    }, 15_000);
    return () => clearInterval(timer);
  }, [assetId]);

  const freshness = asset ? freshnessBadge(asset.lastSeenAt) : null;
  const meta = (asset?.metadata as Record<string, any>) ?? {};

  return (
    <AnimatePresence>
      {assetId && (
        <motion.div
          key="asset-detail"
          initial={{ x: "100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 280, damping: 30 }}
          className="flex h-full w-full flex-col overflow-hidden rounded-card border border-border bg-base-card"
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-border p-4">
            <div className="flex-1 min-w-0">
              {loading ? (
                <div className="space-y-2">
                  <div className="skeleton h-5 w-40 rounded" />
                  <div className="skeleton h-3 w-24 rounded" />
                </div>
              ) : asset ? (
                <>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{CATEGORY_ICONS[asset.category]}</span>
                    <span className="font-mono text-xs font-bold text-accent-cyan">{asset.assetCode}</span>
                    {freshness && (
                      <span className={clsx("text-[10px] font-bold px-2 py-0.5 rounded-full border", freshness.color)}>
                        {freshness.label}
                      </span>
                    )}
                  </div>
                  <h2 className="text-sm font-semibold text-text-primary leading-snug pr-2">
                    {asset.name}
                  </h2>
                  <p className="text-xs text-text-muted mt-0.5">
                    {CATEGORY_LABELS[asset.category]} · {ASSET_TYPE_LABELS[asset.assetType] ?? asset.assetType}
                  </p>
                </>
              ) : (
                <p className="text-sm text-accent-red">Asset not found</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="ml-2 rounded-lg p-1.5 text-text-muted transition-colors hover:bg-base-elevated hover:text-text-primary"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          {asset && !loading && (
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {/* Status + Health */}
              <div className="flex items-center justify-between">
                <AssetStatusBadge status={asset.status as any} size="md" pulse />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-muted">Health</span>
                  <span className={clsx("text-sm font-bold",
                    asset.healthScore >= 80 ? "text-accent-green" :
                    asset.healthScore >= 50 ? "text-accent-amber" : "text-accent-red"
                  )}>
                    {asset.healthScore}%
                  </span>
                  <div className="h-1.5 w-16 overflow-hidden rounded-full bg-base-elevated">
                    <div
                      className={clsx("h-full rounded-full",
                        asset.healthScore >= 80 ? "bg-accent-green" :
                        asset.healthScore >= 50 ? "bg-accent-amber" : "bg-accent-red"
                      )}
                      style={{ width: `${asset.healthScore}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Live Telemetry */}
              <LiveDataSection liveData={asset.liveData} />

              {/* Identity */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2 flex items-center gap-1.5">
                  <Info size={12} />
                  Identity
                </p>
                <div className="rounded-xl border border-border bg-base-elevated overflow-hidden">
                  <MetaRow label="Asset Code"  value={<span className="font-mono font-bold text-accent-cyan">{asset.assetCode}</span>} />
                  <MetaRow label="Type"         value={ASSET_TYPE_LABELS[asset.assetType] ?? asset.assetType} />
                  <MetaRow label="Category"     value={CATEGORY_LABELS[asset.category]} />
                  <MetaRow label="Zone"         value={asset.zoneName ?? "—"} />
                  <MetaRow label="Ward"         value={asset.ward ?? "—"} />
                  <MetaRow label="Source"       value={asset.refType ? `Linked · ${asset.refType}` : "Standalone"} />
                  <MetaRow label="Demo Data"    value={asset.isDemo ? "Yes — Simulated" : "No"} />
                </div>
              </div>

              {/* Location */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2 flex items-center gap-1.5">
                  <MapPin size={12} />
                  Location
                </p>
                <div className="rounded-xl border border-border bg-base-elevated overflow-hidden">
                  <MetaRow label="Latitude"  value={asset.lat.toFixed(6)} />
                  <MetaRow label="Longitude" value={asset.lng.toFixed(6)} />
                </div>
              </div>

              {/* Timestamps */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2 flex items-center gap-1.5">
                  <Clock size={12} />
                  Freshness
                </p>
                <div className="rounded-xl border border-border bg-base-elevated overflow-hidden">
                  <MetaRow label="Last Seen"  value={formatRelativeTime(asset.lastSeenAt)} />
                  <MetaRow label="Updated"    value={formatRelativeTime(asset.updatedAt)} />
                  <MetaRow label="Registered" value={new Date(asset.updatedAt).toLocaleDateString()} />
                </div>
              </div>

              {/* Metadata preview */}
              {Object.keys(meta).length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2 flex items-center gap-1.5">
                    <Layers size={12} />
                    Operational Details
                  </p>
                  <div className="rounded-xl border border-border bg-base-elevated overflow-hidden">
                    {Object.entries(meta)
                      .filter(([k]) => !["zoneName", "lastEvent", "junctionId", "threshold", "thresholds"].includes(k))
                      .slice(0, 8)
                      .map(([k, v]) => (
                        <MetaRow
                          key={k}
                          label={k.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase())}
                          value={typeof v === "object" ? JSON.stringify(v) : String(v ?? "—")}
                        />
                      ))}
                  </div>
                </div>
              )}

              {/* Related incidents */}
              {asset.relatedIncidents && asset.relatedIncidents.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2 flex items-center gap-1.5">
                    <AlertTriangle size={12} className="text-accent-amber" />
                    Nearby Active Incidents
                  </p>
                  <div className="space-y-2">
                    {asset.relatedIncidents.map(inc => (
                      <div key={inc.id} className="rounded-lg border border-accent-amber/20 bg-accent-amber/5 p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-accent-amber capitalize">{inc.type}</span>
                          <span className="text-xs text-text-muted">Sev. {inc.severity}</span>
                        </div>
                        <p className="text-xs text-text-secondary">{inc.description ?? "No description"}</p>
                        <p className="text-[10px] text-text-muted mt-1">{formatRelativeTime(inc.reportedAt)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {asset.relatedIncidents?.length === 0 && (
                <p className="text-xs text-text-muted text-center">No active incidents near this asset</p>
              )}
            </div>
          )}

          {/* Demo indicator */}
          <div className="border-t border-border p-3 flex items-center justify-center gap-2">
            <Radio size={12} className="text-amber-500 animate-pulse" />
            <span className="text-[10px] font-semibold text-amber-500/80">LIVE DEMO · SIMULATED TELEMETRY</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
