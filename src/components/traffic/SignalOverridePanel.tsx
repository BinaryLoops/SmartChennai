"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";

interface SignalOverridePanelProps {
  junctionId: string;
  initialGreen: number;
  initialRed: number;
}

export function SignalOverridePanel({
  junctionId,
  initialGreen,
  initialRed,
}: SignalOverridePanelProps) {
  const t = useTranslations("traffic");

  const [green, setGreen] = useState(initialGreen);
  const [red, setRed] = useState(initialRed);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReadOnly, setIsReadOnly] = useState(false);

  useEffect(() => {
    const match = document.cookie.match(/(^| )user_role=([^;]+)/);
    if (match) {
      const role = match[2];
      setIsReadOnly(role === "dm" || role === "commissioner");
    }
  }, []);

  const handleSave = async () => {
    if (isReadOnly) return;
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch(`/api/dashboard/traffic/${junctionId}/override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ greenDuration: green, redDuration: red }),
      });

      if (!res.ok) {
        throw new Error("Failed to save override");
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      setError(t("overrideError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-full flex-col rounded-card border border-border bg-base-card p-5 shadow-lg">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-text-primary">
        {t("manualOverride")}
      </h3>

      <div className="flex-1 space-y-6">
        {/* Green Duration Slider */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-text-secondary">
              {t("greenDuration")}
            </span>
            <span className="font-mono text-sm font-bold text-accent-green">
              {green}s
            </span>
          </div>
          <input
            type="range"
            min="10"
            max="120"
            step="5"
            value={green}
            disabled={isReadOnly}
            onChange={(e) => setGreen(Number(e.target.value))}
            className="w-full accent-accent-green disabled:opacity-50"
          />
          <div className="flex justify-between text-[10px] text-text-muted">
            <span>10s</span>
            <span>120s</span>
          </div>
        </div>

        {/* Red Duration Slider */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-text-secondary">
              {t("redDuration")}
            </span>
            <span className="font-mono text-sm font-bold text-accent-red">
              {red}s
            </span>
          </div>
          <input
            type="range"
            min="10"
            max="120"
            step="5"
            value={red}
            disabled={isReadOnly}
            onChange={(e) => setRed(Number(e.target.value))}
            className="w-full accent-accent-red disabled:opacity-50"
          />
          <div className="flex justify-between text-[10px] text-text-muted">
            <span>10s</span>
            <span>120s</span>
          </div>
        </div>
      </div>

      <div className="mt-6">
        {error && <p className="mb-3 text-xs text-accent-red">{error}</p>}
        
        <button
          onClick={handleSave}
          disabled={saving || success || isReadOnly}
          className="relative w-full overflow-hidden rounded-lg bg-accent-cyan px-4 py-2.5 text-sm font-semibold text-base-card transition-all hover:bg-cyan-400 disabled:opacity-50"
        >
          <AnimatePresence mode="wait">
            {success ? (
              <motion.div
                key="success"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                className="flex items-center justify-center gap-2"
              >
                <span>✓</span> {t("saved")}
              </motion.div>
            ) : saving ? (
              <motion.div
                key="saving"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
              >
                {t("saving")}...
              </motion.div>
            ) : (
              <motion.div
                key="apply"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
              >
                {t("applyOverride")}
              </motion.div>
            )}
          </AnimatePresence>
        </button>
      </div>
    </div>
  );
}
