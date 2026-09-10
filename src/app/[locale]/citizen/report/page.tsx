"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { LocationPicker } from "@/components/citizen/LocationPicker";
import { IncidentTypeSelector } from "@/components/citizen/IncidentTypeSelector";
import { SeveritySlider } from "@/components/citizen/SeveritySlider";

const STEPS = ["step1", "step2", "step3"] as const;

const TYPE_ICONS: Record<string, string> = {
  traffic: "🚗",
  fire: "🔥",
  medical: "🏥",
  flood: "🌊",
};

const SEVERITY_LABELS = ["minor", "low", "moderate", "high", "critical"] as const;

interface SavedReport {
  referenceId: string;
  type: string;
  submittedAt: string;
}

export default function ReportPage() {
  const t = useTranslations("citizen.report");
  const locale = useLocale();

  // Form state
  const [step, setStep] = useState(0);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [type, setType] = useState<string | null>(null);
  const [severity, setSeverity] = useState(2);
  const [description, setDescription] = useState("");
  const [locationError, setLocationError] = useState<string | null>(null);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    status: "success" | "error";
    referenceId?: string;
    message?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleLocationChange = useCallback((newLat: number, newLng: number) => {
    setLat(newLat);
    setLng(newLng);
    setLocationError(null);
  }, []);

  const handleLocationError = useCallback((message: string) => {
    setLocationError(message);
  }, []);

  const canProceedStep0 = lat !== null && lng !== null;
  const canProceedStep1 = type !== null;

  const handleSubmit = async () => {
    if (!lat || !lng || !type) return;

    setSubmitting(true);
    try {
      const body: any = {
        type,
        lat,
        lng,
        severity,
        source: "citizen",
      };
      if (description.trim().length >= 3) {
        body.description = description.trim();
      }

      const res = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.status === 202) {
        const data = await res.json();
        setResult({ status: "success", referenceId: data.referenceId });

        // Save to localStorage
        try {
          const stored: SavedReport[] = JSON.parse(
            localStorage.getItem("smartChennai_reports") || "[]"
          );
          stored.unshift({
            referenceId: data.referenceId,
            type,
            submittedAt: new Date().toISOString(),
          });
          // Keep only last 20
          localStorage.setItem(
            "smartChennai_reports",
            JSON.stringify(stored.slice(0, 20))
          );
        } catch {}
      } else if (res.status === 429) {
        setResult({ status: "error", message: t("rateLimited") });
      } else {
        const data = await res.json().catch(() => ({}));
        setResult({
          status: "error",
          message: data.error || "Something went wrong",
        });
      }
    } catch (err) {
      setResult({ status: "error", message: "Network error. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyId = async () => {
    if (result?.referenceId) {
      await navigator.clipboard.writeText(result.referenceId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleReset = () => {
    setStep(0);
    setLat(null);
    setLng(null);
    setType(null);
    setSeverity(2);
    setDescription("");
    setLocationError(null);
    setResult(null);
    setCopied(false);
  };

  // Success / Error screens
  if (result) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="rounded-2xl border border-border bg-base-card p-8 text-center"
        >
          {result.status === "success" ? (
            <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20"
              >
                <span className="text-3xl">✅</span>
              </motion.div>
              <h2 className="text-xl font-bold text-text-primary">{t("successTitle")}</h2>
              <p className="mt-2 text-sm text-text-secondary">{t("successMessage")}</p>

              <div className="mx-auto mt-6 max-w-sm rounded-xl border border-accent-cyan/30 bg-accent-cyan/5 p-4">
                <p className="text-xs uppercase tracking-wider text-text-muted">{t("referenceId")}</p>
                <p className="mt-1 font-mono text-lg font-bold text-accent-cyan">
                  {result.referenceId}
                </p>
                <button
                  onClick={handleCopyId}
                  className="mt-2 rounded-lg bg-accent-cyan/20 px-4 py-1.5 text-xs font-medium text-accent-cyan transition-colors hover:bg-accent-cyan/30"
                >
                  {copied ? t("copied") : t("copyId")}
                </button>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <a
                  href={`/${locale}/citizen/track?ref=${result.referenceId}`}
                  className="rounded-lg bg-accent-cyan px-6 py-2.5 text-sm font-medium text-base transition-colors hover:bg-cyan-500"
                >
                  {t("trackThisReport")}
                </a>
                <button
                  onClick={handleReset}
                  className="rounded-lg border border-border px-6 py-2.5 text-sm text-text-secondary transition-colors hover:border-border-strong hover:text-text-primary"
                >
                  {t("reportAnother")}
                </button>
              </div>
            </>
          ) : (
            <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20"
              >
                <span className="text-3xl">❌</span>
              </motion.div>
              <h2 className="text-xl font-bold text-text-primary">{t("errorTitle")}</h2>
              <p className="mt-2 text-sm text-text-secondary">{result.message}</p>
              <button
                onClick={handleReset}
                className="mt-6 rounded-lg bg-accent-cyan px-6 py-2.5 text-sm font-medium text-base transition-colors hover:bg-cyan-500"
              >
                {t("tryAgain")}
              </button>
            </>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-text-primary">{t("title")}</h1>
      </div>

      {/* Step Indicator */}
      <div className="mb-8 flex items-center justify-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <button
              onClick={() => {
                if (i < step) setStep(i);
              }}
              className={clsx(
                "flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-all duration-300",
                i === step
                  ? "bg-accent-cyan text-base shadow-glow"
                  : i < step
                  ? "bg-accent-cyan/20 text-accent-cyan"
                  : "bg-base-card text-text-muted"
              )}
            >
              {i < step ? "✓" : i + 1}
            </button>
            <span className={clsx(
              "hidden text-xs sm:block",
              i === step ? "font-medium text-text-primary" : "text-text-muted"
            )}>
              {t(s)}
            </span>
            {i < STEPS.length - 1 && (
              <div className={clsx(
                "mx-1 h-[2px] w-8 rounded-full transition-colors duration-300",
                i < step ? "bg-accent-cyan" : "bg-base-card"
              )} />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="rounded-2xl border border-border bg-base-card p-6"
        >
          {/* Step 0: Location */}
          {step === 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-text-primary">{t("step1")}</h2>
              <LocationPicker
                lat={lat}
                lng={lng}
                onLocationChange={handleLocationChange}
                onError={handleLocationError}
              />
              {locationError && (
                <p className="text-sm text-accent-red">{locationError}</p>
              )}
            </div>
          )}

          {/* Step 1: Details */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-text-primary">{t("incidentType")}</h2>
                <p className="mb-3 text-sm text-text-muted">{t("selectType")}</p>
                <IncidentTypeSelector selected={type} onSelect={setType} />
              </div>

              <SeveritySlider value={severity} onChange={setSeverity} />

              <div>
                <label className="mb-2 block text-sm font-medium text-text-primary">
                  {t("description")}
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t("descriptionPlaceholder")}
                  rows={3}
                  maxLength={1000}
                  className="w-full rounded-xl border border-border bg-base-elevated px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-cyan focus:outline-none focus:ring-1 focus:ring-accent-cyan"
                />
                <p className="mt-1 text-right text-xs text-text-muted">
                  {description.length} / 1000
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Confirm */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-text-primary">{t("summary")}</h2>

              <div className="divide-y divide-border rounded-xl border border-border bg-base-elevated">
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-text-muted">{t("location")}</span>
                  <span className="font-mono text-sm text-accent-cyan">
                    {lat?.toFixed(5)}, {lng?.toFixed(5)}
                  </span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-text-muted">{t("type")}</span>
                  <span className="flex items-center gap-2 text-sm font-medium text-text-primary">
                    {type && TYPE_ICONS[type]} {type}
                  </span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-text-muted">{t("severity")}</span>
                  <span className="text-sm font-medium text-text-primary">
                    {severity}/5 — {t(SEVERITY_LABELS[severity - 1])}
                  </span>
                </div>
                {description.trim().length >= 3 && (
                  <div className="px-4 py-3">
                    <span className="text-sm text-text-muted">{t("description")}</span>
                    <p className="mt-1 text-sm text-text-primary">{description}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation Buttons */}
      <div className="mt-6 flex justify-between">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="rounded-lg border border-border px-5 py-2.5 text-sm text-text-secondary transition-colors hover:border-border-strong hover:text-text-primary disabled:invisible"
        >
          ← {t("back")}
        </button>

        {step < 2 ? (
          <button
            onClick={() => setStep((s) => s + 1)}
            disabled={step === 0 ? !canProceedStep0 : !canProceedStep1}
            className="rounded-lg bg-accent-cyan px-5 py-2.5 text-sm font-medium text-base transition-all hover:bg-cyan-500 disabled:opacity-40 disabled:hover:bg-accent-cyan"
          >
            {t("next")} →
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-2 rounded-lg bg-accent-cyan px-6 py-2.5 text-sm font-medium text-base transition-all hover:bg-cyan-500 disabled:opacity-60"
          >
            {submitting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-base border-t-transparent" />
                {t("submitting")}
              </>
            ) : (
              t("submitReport")
            )}
          </button>
        )}
      </div>
    </div>
  );
}
