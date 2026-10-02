"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { getOrCreateSessionToken } from "@/lib/sessionToken";

const CATEGORY_META: Record<string, { icon: string; label: string; color: string }> = {
  ROAD:           { icon: "🛣️", label: "Road / Pothole",      color: "text-orange-400" },
  WATER:          { icon: "💧", label: "Water Supply",        color: "text-blue-400" },
  DRAINAGE:       { icon: "🌊", label: "Drainage / Flooding", color: "text-cyan-400" },
  STREETLIGHT:    { icon: "💡", label: "Street Light",        color: "text-yellow-400" },
  WASTE:          { icon: "🗑️", label: "Waste / Garbage",     color: "text-green-400" },
  TRAFFIC:        { icon: "🚦", label: "Traffic Signal",      color: "text-red-400" },
  CCTV:           { icon: "📷", label: "CCTV / Surveillance", color: "text-purple-400" },
  PUBLIC_FACILITY:{ icon: "🏛️", label: "Public Facility",    color: "text-indigo-400" },
  TRANSIT:        { icon: "🚌", label: "Transit / Bus Stop",  color: "text-pink-400" },
  OTHER:          { icon: "❓", label: "Other",               color: "text-text-muted" },
};

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

interface ServiceRequest {
  id: string;
  referenceCode: string;
  category: string;
  description: string;
  status: string;
  priority: string;
  department: string;
  slaDueAt: string | null;
  submittedAt: string;
  resolvedAt: string | null;
  rating: number | null;
  slaStatus?: string;
  asset?: { name: string; assetCode: string } | null;
  zone?: { name: string } | null;
}

export default function MyReportsPage() {
  const locale = useLocale();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = getOrCreateSessionToken();
      const res = await fetch("/api/citizen/reports", {
        headers: { "x-session-token": token },
      });
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setRequests(data.requests ?? []);
    } catch {
      setError("Could not load your reports. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function timeAgo(iso: string) {
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return s + "s ago";
    if (s < 3600) return Math.floor(s / 60) + "m ago";
    if (s < 86400) return Math.floor(s / 3600) + "h ago";
    return Math.floor(s / 86400) + "d ago";
  }

  function slaLabel(req: ServiceRequest): string {
    if (!req.slaDueAt) return "—";
    const remaining = new Date(req.slaDueAt).getTime() - Date.now();
    if (remaining < 0 && req.status !== "RESOLVED" && req.status !== "CLOSED") return "Breached";
    if (req.status === "RESOLVED" || req.status === "CLOSED") return "Done";
    const hrs = Math.floor(remaining / 3600000);
    if (hrs < 24) return hrs + "h left";
    return Math.floor(hrs / 24) + "d left";
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">My Service Reports</h1>
          <p className="mt-1 text-sm text-text-muted">
            LIVE DEMO • SIMULATED TELEMETRY — Reports submitted from this browser
          </p>
        </div>
        <a
          href={"/" + locale + "/citizen/reports/new"}
          className="rounded-xl bg-accent-cyan px-4 py-2.5 text-sm font-semibold text-base transition-all hover:bg-cyan-500"
        >
          + Report Issue
        </a>
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <span className="h-10 w-10 animate-spin rounded-full border-4 border-accent-cyan border-t-transparent" />
        </div>
      )}

      {error && !loading && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center text-sm text-red-400">
          {error}
        </div>
      )}

      {!loading && !error && requests.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border bg-base-card p-12 text-center"
        >
          <span className="text-5xl">📋</span>
          <h2 className="mt-4 text-lg font-semibold text-text-primary">No reports yet</h2>
          <p className="mt-2 text-sm text-text-secondary">
            Submit your first infrastructure report to track it here.
          </p>
          <a
            href={"/" + locale + "/citizen/reports/new"}
            className="mt-6 inline-block rounded-xl bg-accent-cyan px-6 py-2.5 text-sm font-semibold text-base transition-all hover:bg-cyan-500"
          >
            Report an Issue
          </a>
        </motion.div>
      )}

      <AnimatePresence>
        {!loading && requests.map((req, i) => {
          const meta = CATEGORY_META[req.category] ?? CATEGORY_META.OTHER;
          const sla = slaLabel(req);
          const slaColor = req.status === "RESOLVED" || req.status === "CLOSED"
            ? SLA_STYLE.RESOLVED
            : sla === "Breached" ? SLA_STYLE.BREACHED
            : sla.includes("h") && parseInt(sla) < 4 ? SLA_STYLE.AT_RISK
            : SLA_STYLE.ON_TRACK;

          return (
            <motion.a
              key={req.id}
              href={"/" + locale + "/citizen/reports/" + req.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="mb-3 flex items-center gap-4 rounded-2xl border border-border bg-base-card p-4 transition-all hover:border-accent-cyan/40 hover:shadow-[0_0_20px_rgba(34,211,238,0.08)]"
            >
              <span className="text-3xl">{meta.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs text-accent-cyan">{req.referenceCode}</span>
                  <span className={clsx("rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase", STATUS_STYLE[req.status] ?? "bg-base-elevated text-text-muted")}>
                    {req.status.replace("_", " ")}
                  </span>
                  <span className={clsx("text-xs font-medium", slaColor)}>
                    SLA: {sla}
                  </span>
                </div>
                <p className="mt-1 truncate text-sm text-text-primary">
                  {meta.label} — {req.description.substring(0, 60)}{req.description.length > 60 ? "…" : ""}
                </p>
                <div className="mt-1 flex gap-2 text-xs text-text-muted">
                  {req.zone && <span>📍 {req.zone.name}</span>}
                  {req.asset && <span>🔧 {req.asset.assetCode}</span>}
                  <span>{timeAgo(req.submittedAt)}</span>
                  {req.department && <span>· {req.department}</span>}
                </div>
              </div>
              <span className="text-text-muted">→</span>
            </motion.a>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
