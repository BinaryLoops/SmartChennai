"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import clsx from "clsx";

const TYPE_ICONS: Record<string, string> = {
  traffic: "🚗",
  fire: "🔥",
  medical: "🏥",
  flood: "🌊",
};

const STATUS_ORDER = ["reported", "verified", "dispatched", "resolved"] as const;

interface SavedReport {
  referenceId: string;
  type: string;
  submittedAt: string;
}

function TrackPage() {
  const t = useTranslations("citizen.track");
  const searchParams = useSearchParams();

  const [refId, setRefId] = useState("");
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);

  // Load saved reports from localStorage
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("smartChennai_reports") || "[]");
      setSavedReports(stored);
    } catch {}
  }, []);

  // Pre-populate from URL query
  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) {
      setRefId(ref);
      handleSearch(ref);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = useCallback(async (id?: string) => {
    const searchId = id || refId;
    if (!searchId.trim()) return;

    setSearching(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`/api/incidents?referenceId=${encodeURIComponent(searchId.trim())}`);
      const data = await res.json();

      if (res.status === 404) {
        setError(t("notFound"));
      } else if (data.status === "queued" || data.status === "processed") {
        setResult(data);
      } else if (data.incident) {
        setResult({ status: "processed", incident: data.incident });
      } else {
        setError(t("notFound"));
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSearching(false);
    }
  }, [refId, t]);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setRefId(text.trim());
      }
    } catch {}
  };

  const getStatusIndex = (status: string) => {
    return STATUS_ORDER.indexOf(status as any);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  const getPriorityBand = (score: number) => {
    if (score >= 80) return { label: "Critical", color: "text-red-400 bg-red-500/20" };
    if (score >= 60) return { label: "High", color: "text-orange-400 bg-orange-500/20" };
    if (score >= 40) return { label: "Medium", color: "text-amber-400 bg-amber-500/20" };
    return { label: "Low", color: "text-green-400 bg-green-500/20" };
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-text-primary">{t("title")}</h1>
        <p className="mt-2 text-sm text-text-secondary">{t("subtitle")}</p>
      </div>

      {/* Search */}
      <div className="mb-8 flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={refId}
            onChange={(e) => setRefId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder={t("enterRef")}
            className="w-full rounded-xl border border-border bg-base-card px-4 py-3 pr-16 font-mono text-sm text-text-primary placeholder:text-text-muted focus:border-accent-cyan focus:outline-none focus:ring-1 focus:ring-accent-cyan"
          />
          <button
            onClick={handlePaste}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-base-elevated px-3 py-1 text-xs text-text-secondary transition-colors hover:text-text-primary"
          >
            {t("paste")}
          </button>
        </div>
        <button
          onClick={() => handleSearch()}
          disabled={searching || !refId.trim()}
          className="flex items-center gap-2 rounded-xl bg-accent-cyan px-5 py-3 text-sm font-medium text-base transition-all hover:bg-cyan-500 disabled:opacity-50"
        >
          {searching ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-base border-t-transparent" />
              {t("searching")}
            </>
          ) : (
            t("search")
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-center text-sm text-red-400"
        >
          {error}
        </motion.div>
      )}

      {/* Result — Queued */}
      {result?.status === "queued" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 rounded-2xl border border-amber-500/30 bg-base-card p-6"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/20">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-amber-400">{t("queued")}</h3>
              <p className="text-sm text-text-secondary">{t("queuedDesc")}</p>
            </div>
          </div>
          <div className="mt-4 rounded-lg bg-base-elevated px-4 py-2">
            <span className="text-xs text-text-muted">{t("queueState")}: </span>
            <span className="text-sm font-medium capitalize text-text-primary">
              {result.queueState}
            </span>
          </div>
        </motion.div>
      )}

      {/* Result — Processed */}
      {result?.status === "processed" && result.incident && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 space-y-4"
        >
          <div className="rounded-2xl border border-border bg-base-card p-6">
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">
                  {TYPE_ICONS[result.incident.type] || "⚠️"}
                </span>
                <div>
                  <h3 className="text-lg font-semibold capitalize text-text-primary">
                    {result.incident.type}
                  </h3>
                  <p className="font-mono text-xs text-text-muted">
                    {result.incident.referenceId}
                  </p>
                </div>
              </div>
              <span className={clsx(
                "rounded-full px-3 py-1 text-xs font-semibold uppercase",
                result.incident.status === "resolved"
                  ? "bg-green-500/20 text-green-400"
                  : result.incident.status === "dispatched"
                  ? "bg-blue-500/20 text-blue-400"
                  : "bg-amber-500/20 text-amber-400"
              )}>
                {result.incident.status}
              </span>
            </div>

            {/* Status Timeline */}
            <div className="mb-6">
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
                {t("statusTimeline")}
              </h4>
              <div className="flex items-center justify-between">
                {STATUS_ORDER.map((status, i) => {
                  const currentIdx = getStatusIndex(result.incident.status);
                  const isComplete = i <= currentIdx;
                  const isCurrent = i === currentIdx;
                  return (
                    <div key={status} className="flex flex-1 items-center">
                      <div className="flex flex-col items-center gap-1">
                        <div className={clsx(
                          "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors",
                          isCurrent
                            ? "bg-accent-cyan text-base shadow-glow"
                            : isComplete
                            ? "bg-accent-cyan/20 text-accent-cyan"
                            : "bg-base-elevated text-text-muted"
                        )}>
                          {isComplete ? "✓" : i + 1}
                        </div>
                        <span className={clsx(
                          "text-[10px]",
                          isCurrent ? "font-medium text-accent-cyan" : "text-text-muted"
                        )}>
                          {t(status)}
                        </span>
                      </div>
                      {i < STATUS_ORDER.length - 1 && (
                        <div className={clsx(
                          "mx-1 h-[2px] flex-1 rounded-full",
                          i < currentIdx ? "bg-accent-cyan" : "bg-base-elevated"
                        )} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Details grid */}
            <div className="divide-y divide-border rounded-xl border border-border bg-base-elevated">
              <div className="flex justify-between px-4 py-3">
                <span className="text-xs text-text-muted">{t("submittedAt")}</span>
                <span className="text-sm text-text-primary">
                  {formatDate(result.incident.reportedAt)}
                </span>
              </div>
              <div className="flex justify-between px-4 py-3">
                <span className="text-xs text-text-muted">Severity</span>
                <span className="text-sm font-medium text-text-primary">
                  {result.incident.severity}/5
                </span>
              </div>
              {result.incident.priorityScore != null && (
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-xs text-text-muted">{t("priorityScore")}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-text-primary">
                      {result.incident.priorityScore.toFixed(1)}
                    </span>
                    <span className={clsx(
                      "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      getPriorityBand(result.incident.priorityScore).color
                    )}>
                      {getPriorityBand(result.incident.priorityScore).label}
                    </span>
                  </div>
                </div>
              )}
              {result.incident.reportedBy > 1 && (
                <div className="flex justify-between px-4 py-3">
                  <span className="text-xs text-text-muted">Crowd Reports</span>
                  <span className="text-sm text-accent-cyan">
                    {t("reportedBy", { count: result.incident.reportedBy })}
                  </span>
                </div>
              )}
              {result.incident.unit && (
                <div className="flex justify-between px-4 py-3">
                  <span className="text-xs text-text-muted">{t("dispatchedUnit")}</span>
                  <span className="text-sm text-text-primary">
                    {result.incident.unit.name} ({result.incident.unit.type})
                  </span>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Recent Reports from localStorage */}
      {savedReports.length > 0 && (
        <div className="mt-8">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-text-muted">
            {t("recentReports")}
          </h3>
          <div className="space-y-2">
            {savedReports.map((report) => (
              <button
                key={report.referenceId}
                onClick={() => {
                  setRefId(report.referenceId);
                  handleSearch(report.referenceId);
                }}
                className="flex w-full items-center gap-3 rounded-xl border border-border bg-base-card p-3 text-left transition-colors hover:border-border-strong"
              >
                <span className="text-xl">{TYPE_ICONS[report.type] || "⚠️"}</span>
                <div className="flex-1">
                  <p className="font-mono text-sm text-accent-cyan">{report.referenceId}</p>
                  <p className="text-xs text-text-muted">
                    {new Date(report.submittedAt).toLocaleDateString()} · {report.type}
                  </p>
                </div>
                <span className="text-text-muted">→</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!result && !error && savedReports.length === 0 && (
        <div className="mt-8 text-center text-sm text-text-muted">
          {t("noRecentReports")}
        </div>
      )}
    </div>
  );
}

import { Suspense } from "react";

export default function TrackPageWrapper() {
  return (
    <Suspense fallback={<div className="flex justify-center p-8"><span className="animate-spin h-8 w-8 border-4 border-accent-cyan border-t-transparent rounded-full" /></div>}>
      <TrackPage />
    </Suspense>
  );
}
