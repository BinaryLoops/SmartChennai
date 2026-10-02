"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useLocale } from "next-intl";
import { motion } from "framer-motion";
import clsx from "clsx";
import { getOrCreateSessionToken } from "@/lib/sessionToken";

const STATUS_ORDER = [
  "SUBMITTED", "RECEIVED", "VERIFIED", "TRIAGED",
  "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED"
];

const STATUS_STYLE: Record<string, string> = {
  SUBMITTED:   "bg-slate-500/20 text-slate-300",
  RECEIVED:    "bg-blue-500/20 text-blue-300",
  VERIFIED:    "bg-indigo-500/20 text-indigo-300",
  TRIAGED:     "bg-purple-500/20 text-purple-300",
  ASSIGNED:    "bg-amber-500/20 text-amber-300",
  IN_PROGRESS: "bg-cyan-500/20 text-cyan-300",
  BLOCKED:     "bg-red-500/20 text-red-300",
  RESOLVED:    "bg-green-500/20 text-green-300",
  CLOSED:      "bg-emerald-500/20 text-emerald-300",
  REJECTED:    "bg-red-700/20 text-red-400",
};

const SLA_STYLE: Record<string, string> = {
  ON_TRACK: "text-green-400",
  AT_RISK:  "text-amber-400",
  BREACHED: "text-red-400",
  RESOLVED: "text-text-muted",
};

const CATEGORY_ICONS: Record<string, string> = {
  ROAD: "🛣️", WATER: "💧", DRAINAGE: "🌊", STREETLIGHT: "💡",
  WASTE: "🗑️", TRAFFIC: "🚦", CCTV: "📷", PUBLIC_FACILITY: "🏛️",
  TRANSIT: "🚌", OTHER: "❓",
};

interface ReportDetail {
  id: string;
  referenceCode: string;
  category: string;
  description: string;
  lat: number;
  lng: number;
  ward: string | null;
  status: string;
  priority: string;
  department: string | null;
  slaDueAt: string | null;
  submittedAt: string;
  assignedAt: string | null;
  resolvedAt: string | null;
  updatedAt: string;
  rating: number | null;
  ratingFeedback: string | null;
  slaStatus: string;
  asset: { name: string; assetCode: string; assetType: string; status: string } | null;
  zone: { name: string } | null;
  workOrder: {
    workOrderCode: string;
    status: string;
    priority: string;
    assignedTeam: string | null;
    Crew: { crewCode: string; specialization: string } | null;
  } | null;
  timeline: Array<{ id: string; status: string; note: string | null; timestamp: string }>;
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          className="text-2xl transition-transform hover:scale-110"
        >
          {star <= (hover || value) ? "⭐" : "☆"}
        </button>
      ))}
    </div>
  );
}

import { use } from "react";
export default function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const locale = useLocale();

  const [report, setReport] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackDone, setFeedbackDone] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = getOrCreateSessionToken();
      const res = await fetch("/api/citizen/reports/" + id, {
        headers: { "x-session-token": token },
      });
      if (res.status === 403) { setError("Access denied."); return; }
      if (res.status === 404) { setError("Report not found."); return; }
      const data = await res.json();
      setReport(data.request);
    } catch {
      setError("Could not load report.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function submitFeedback() {
    if (!report || rating === 0) return;
    setSubmittingFeedback(true);
    try {
      const token = getOrCreateSessionToken();
      const res = await fetch("/api/citizen/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: report.id, rating, feedback: feedback.trim() || undefined, sessionToken: token }),
      });
      if (res.ok) {
        setFeedbackDone(true);
        load();
      }
    } finally {
      setSubmittingFeedback(false);
    }
  }

  if (loading) return (
    <div className="flex justify-center py-24">
      <span className="h-10 w-10 animate-spin rounded-full border-4 border-accent-cyan border-t-transparent" />
    </div>
  );

  if (error) return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center text-red-400">{error}</div>
  );

  if (!report) return null;

  const icon = CATEGORY_ICONS[report.category] ?? "❓";
  const statusIdx = STATUS_ORDER.indexOf(report.status);
  const canRate = (report.status === "RESOLVED" || report.status === "CLOSED") && !report.rating && !feedbackDone;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border bg-base-card p-6">
        <div className="flex items-start gap-4">
          <span className="text-4xl">{icon}</span>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-bold text-accent-cyan">{report.referenceCode}</span>
              <span className={clsx("rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase", STATUS_STYLE[report.status] ?? "bg-base-elevated text-text-muted")}>
                {report.status.replace("_", " ")}
              </span>
              <span className={clsx("text-xs font-semibold", SLA_STYLE[report.slaStatus] ?? "text-text-muted")}>
                SLA: {report.slaStatus}
              </span>
            </div>
            <p className="mt-2 text-sm text-text-primary">{report.description}</p>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-text-muted">
              {report.zone && <span>📍 {report.zone.name}</span>}
              {report.ward && <span>· {report.ward}</span>}
              <span>· {new Date(report.submittedAt).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Asset linkage */}
        {report.asset && (
          <div className="mt-4 rounded-xl bg-accent-cyan/5 border border-accent-cyan/20 px-4 py-2 text-sm">
            🔧 Linked to <strong>{report.asset.assetCode}</strong> — {report.asset.name}
            <span className="ml-2 text-xs text-text-muted">({report.asset.status})</span>
          </div>
        )}
      </motion.div>

      {/* Status Timeline */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-2xl border border-border bg-base-card p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-text-muted">Status Timeline</h3>
        <div className="flex items-center justify-between">
          {STATUS_ORDER.slice(0, 7).map((st, i) => {
            const isComplete = i <= statusIdx;
            const isCurrent = i === statusIdx;
            return (
              <div key={st} className="flex flex-1 items-center">
                <div className="flex flex-col items-center gap-1">
                  <div className={clsx("flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold transition-colors",
                    isCurrent ? "bg-accent-cyan text-base shadow-glow"
                      : isComplete ? "bg-accent-cyan/20 text-accent-cyan"
                      : "bg-base-elevated text-text-muted"
                  )}>
                    {isComplete ? "✓" : i + 1}
                  </div>
                  <span className={clsx("hidden text-[9px] sm:block", isCurrent ? "text-accent-cyan font-medium" : "text-text-muted")}>
                    {st.replace("_", " ")}
                  </span>
                </div>
                {i < STATUS_ORDER.slice(0, 7).length - 1 && (
                  <div className={clsx("mx-1 h-[2px] flex-1 rounded-full", i < statusIdx ? "bg-accent-cyan" : "bg-base-elevated")} />
                )}
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* WorkOrder details */}
      {report.workOrder && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-2xl border border-border bg-base-card p-6">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-text-muted">Maintenance Work Order</h3>
          <div className="divide-y divide-border rounded-xl border border-border bg-base-elevated">
            <div className="flex justify-between px-4 py-3 text-sm">
              <span className="text-text-muted">Work Order</span>
              <span className="font-mono text-text-primary">{report.workOrder.workOrderCode}</span>
            </div>
            <div className="flex justify-between px-4 py-3 text-sm">
              <span className="text-text-muted">Status</span>
              <span className="text-text-primary">{report.workOrder.status}</span>
            </div>
            <div className="flex justify-between px-4 py-3 text-sm">
              <span className="text-text-muted">Assigned Team</span>
              <span className="text-text-primary">{report.workOrder.assignedTeam ?? "Pending"}</span>
            </div>
            {report.workOrder.Crew && (
              <div className="flex justify-between px-4 py-3 text-sm">
                <span className="text-text-muted">Crew</span>
                <span className="text-text-primary">{report.workOrder.Crew.crewCode} — {report.workOrder.Crew.specialization}</span>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Activity Log */}
      {report.timeline.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="rounded-2xl border border-border bg-base-card p-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-text-muted">Activity</h3>
          <div className="space-y-3">
            {report.timeline.map(t => (
              <div key={t.id} className="flex gap-3 text-sm">
                <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent-cyan" />
                <div>
                  <span className={clsx("rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase", STATUS_STYLE[t.status] ?? "bg-base-elevated text-text-muted")}>{t.status.replace("_", " ")}</span>
                  {t.note && <p className="mt-0.5 text-xs text-text-secondary">{t.note}</p>}
                  <p className="text-[10px] text-text-muted">{new Date(t.timestamp).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Feedback */}
      {canRate && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="rounded-2xl border border-accent-cyan/30 bg-accent-cyan/5 p-6">
          <h3 className="mb-3 text-sm font-semibold text-accent-cyan">How was your experience?</h3>
          <StarRating value={rating} onChange={setRating} />
          <textarea
            value={feedback}
            onChange={e => setFeedback(e.target.value)}
            placeholder="Optional — any comments? (max 500 chars)"
            maxLength={500}
            rows={2}
            className="mt-3 w-full rounded-xl border border-border bg-base-elevated px-3 py-2 text-sm text-text-primary focus:border-accent-cyan focus:outline-none"
          />
          <button
            onClick={submitFeedback}
            disabled={rating === 0 || submittingFeedback}
            className="mt-3 rounded-lg bg-accent-cyan px-5 py-2 text-sm font-medium text-base transition-all hover:bg-cyan-500 disabled:opacity-50"
          >
            {submittingFeedback ? "Submitting…" : "Submit Rating"}
          </button>
        </motion.div>
      )}

      {/* Already rated */}
      {report.rating && (
        <div className="rounded-2xl border border-border bg-base-card p-4 text-center text-sm text-text-muted">
          You rated this {report.rating}/5 ⭐{report.ratingFeedback ? ` — "${report.ratingFeedback}"` : ""}
        </div>
      )}
    </div>
  );
}
