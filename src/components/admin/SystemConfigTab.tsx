"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";

export default function SystemConfigTab() {
  const t = useTranslations("admin");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [config, setConfig] = useState({
    demoModeEnabled: false,
    slaThresholdMins: 30,
    trafficWeight: 30,
    responseWeight: 25,
    floodWeight: 25,
    incidentWeight: 10,
    citizenSatWeight: 10,
    rateLimitMax: 100,
    rateLimitWindow: 900000
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/admin/config");
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          setConfig({
            demoModeEnabled: data.config.demoModeEnabled || false,
            slaThresholdMins: data.config.slaThresholdMins,
            trafficWeight: data.config.trafficWeight,
            responseWeight: data.config.responseWeight,
            floodWeight: data.config.floodWeight,
            incidentWeight: data.config.incidentWeight,
            citizenSatWeight: data.config.citizenSatWeight,
            rateLimitMax: data.config.rateLimitMax,
            rateLimitWindow: data.config.rateLimitWindow,
          });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const sum = config.trafficWeight + config.responseWeight + config.floodWeight + config.incidentWeight + config.citizenSatWeight;
    if (sum !== 100) {
      setMessage({ type: "error", text: t("weightError") });
      setSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config)
      });
      if (res.ok) {
        setMessage({ type: "success", text: t("configSaved") });
      } else {
        setMessage({ type: "error", text: "Failed to save configuration" });
      }
    } catch {
      setMessage({ type: "error", text: "Network error" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-text-muted">Loading...</div>;

  return (
    <form onSubmit={handleSave} className="space-y-8 max-w-3xl">
      {message && (
        <div className={`p-4 rounded-xl text-sm ${message.type === "error" ? "bg-red-500/10 border border-red-500/30 text-red-400" : "bg-green-500/10 border border-green-500/30 text-green-400"}`}>
          {message.text}
        </div>
      )}

      {/* General Settings */}
      <div className="rounded-xl border border-border bg-base-card p-6">
        <h3 className="text-lg font-medium text-text-primary mb-4">General Parameters</h3>
        
        <div className="flex items-center justify-between py-4 border-b border-border">
          <div>
            <div className="font-medium text-text-primary">Demo Mode</div>
            <div className="text-xs text-text-muted">Accelerate 24 hours into 2 minutes for viva presentation.</div>
          </div>
          <button
            type="button"
            onClick={() => setConfig({...config, demoModeEnabled: !config.demoModeEnabled})}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${config.demoModeEnabled ? "bg-accent-cyan" : "bg-base-elevated border border-border"}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config.demoModeEnabled ? "translate-x-6" : "translate-x-1"}`} />
          </button>
        </div>

        <div className="pt-4">
          <label className="block text-sm font-medium text-text-secondary mb-2">{t("slaThreshold")}</label>
          <input 
            type="number" 
            min="1"
            value={config.slaThresholdMins}
            onChange={(e) => setConfig({...config, slaThresholdMins: Number(e.target.value)})}
            className="rounded-lg border border-border bg-base-elevated px-4 py-2 text-sm text-text-primary focus:border-accent-cyan focus:outline-none focus:ring-1 focus:ring-accent-cyan w-full max-w-xs"
          />
        </div>
      </div>

      {/* Health Weights */}
      <div className="rounded-xl border border-border bg-base-card p-6">
        <h3 className="text-lg font-medium text-text-primary mb-4">{t("healthWeights")}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { key: "trafficWeight", label: t("trafficWeight") },
            { key: "responseWeight", label: t("responseWeight") },
            { key: "floodWeight", label: t("floodWeight") },
            { key: "incidentWeight", label: t("incidentWeight") },
            { key: "citizenSatWeight", label: t("citizenSatWeight") }
          ].map((item) => (
            <div key={item.key}>
              <label className="block text-xs font-medium text-text-secondary mb-1">{item.label}</label>
              <input 
                type="number" 
                min="0" max="100"
                value={(config as any)[item.key]}
                onChange={(e) => setConfig({...config, [item.key]: Number(e.target.value)})}
                className="rounded-lg border border-border bg-base-elevated px-4 py-2 text-sm text-text-primary w-full"
              />
            </div>
          ))}
        </div>
        <div className="mt-4 text-xs text-text-muted">
          Sum: {config.trafficWeight + config.responseWeight + config.floodWeight + config.incidentWeight + config.citizenSatWeight}%
        </div>
      </div>

      {/* Rate Limits */}
      <div className="rounded-xl border border-border bg-base-card p-6">
        <h3 className="text-lg font-medium text-text-primary mb-4">{t("rateLimits")}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">{t("maxRequests")}</label>
            <input 
              type="number" 
              min="1"
              value={config.rateLimitMax}
              onChange={(e) => setConfig({...config, rateLimitMax: Number(e.target.value)})}
              className="rounded-lg border border-border bg-base-elevated px-4 py-2 text-sm text-text-primary w-full max-w-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">{t("windowMs")}</label>
            <input 
              type="number" 
              min="1000"
              step="1000"
              value={config.rateLimitWindow}
              onChange={(e) => setConfig({...config, rateLimitWindow: Number(e.target.value)})}
              className="rounded-lg border border-border bg-base-elevated px-4 py-2 text-sm text-text-primary w-full max-w-xs"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button 
          type="submit" 
          disabled={saving}
          className="rounded-lg bg-accent-cyan px-6 py-2 text-sm font-medium text-base hover:bg-cyan-500 disabled:opacity-50"
        >
          {saving ? "Saving..." : t("saveConfig")}
        </button>
      </div>
    </form>
  );
}
