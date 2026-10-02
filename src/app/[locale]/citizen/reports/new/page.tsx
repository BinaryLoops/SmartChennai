"use client";

import React, { useState, useCallback } from "react";
import { useLocale } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { LocationPicker } from "@/components/citizen/LocationPicker";
import { getOrCreateSessionToken } from "@/lib/sessionToken";

const CATEGORIES = [
  { value: "ROAD",            icon: "🛣️", label: "Road / Pothole",      desc: "Damaged roads, potholes, cave-ins" },
  { value: "DRAINAGE",        icon: "🌊", label: "Drainage / Flooding",  desc: "Blocked drains, waterlogging" },
  { value: "STREETLIGHT",     icon: "💡", label: "Street Light",         desc: "Non-working, damaged street lights" },
  { value: "WATER",           icon: "💧", label: "Water Supply",         desc: "Low pressure, contamination, leaks" },
  { value: "WASTE",           icon: "🗑️", label: "Waste / Garbage",      desc: "Overflowing bins, uncollected waste" },
  { value: "TRAFFIC",         icon: "🚦", label: "Traffic Signal",       desc: "Malfunctioning signals, missing signs" },
  { value: "CCTV",            icon: "📷", label: "CCTV / Surveillance",  desc: "Damaged, missing cameras" },
  { value: "PUBLIC_FACILITY", icon: "🏛️", label: "Public Facility",      desc: "Parks, benches, public toilets" },
  { value: "TRANSIT",         icon: "🚌", label: "Transit / Bus Stop",   desc: "Damaged shelter, missing info boards" },
  { value: "OTHER",           icon: "❓", label: "Other Issue",           desc: "Something else in your area" },
] as const;

type Category = typeof CATEGORIES[number]["value"];

interface SubmitResult {
  referenceCode: string;
  department: string;
  slaDueAt: string;
  linkedAsset: { name: string; code: string } | null;
  workOrderCode: string | null;
  nearbyDuplicate: { referenceCode: string; status: string } | null;
}

const STEPS = ["Location", "Issue Type", "Details", "Confirm"] as const;

export default function NewServiceReportPage() {
  const locale = useLocale();

  const [step, setStep] = useState(0);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleLocation = useCallback((lat: number, lng: number) => {
    setLat(lat);
    setLng(lng);
  }, []);

  const handleSubmit = async () => {
    if (!lat || !lng || !category || description.trim().length < 5) return;
    setSubmitting(true);
    setError(null);
    try {
      const token = getOrCreateSessionToken();
      const res = await fetch("/api/citizen/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, description: description.trim(), lat, lng, sessionToken: token }),
      });
      const data = await res.json();
      if (res.status === 201) {
        setResult(data);
      } else {
        setError(data.error ?? "Submission failed. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="rounded-2xl border border-border bg-base-card p-8 text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20"
          >
            <span className="text-3xl">✅</span>
          </motion.div>
          <h2 className="text-xl font-bold text-text-primary">Report Received!</h2>
          <p className="mt-2 text-sm text-text-secondary">
            Your issue has been logged and routed to {result.department}.
          </p>

          <div className="mx-auto mt-6 max-w-sm rounded-xl border border-accent-cyan/30 bg-accent-cyan/5 p-4 text-left">
            <div className="flex justify-between text-xs text-text-muted">
              <span>Reference</span>
              <span className="font-mono font-bold text-accent-cyan">{result.referenceCode}</span>
            </div>
            <div className="mt-2 flex justify-between text-xs text-text-muted">
              <span>Department</span>
              <span className="text-text-primary">{result.department}</span>
            </div>
            {result.linkedAsset && (
              <div className="mt-2 rounded-lg bg-accent-cyan/10 p-2 text-xs text-accent-cyan">
                🔧 Report linked to {result.linkedAsset.code} — {result.linkedAsset.name}
              </div>
            )}
            {result.workOrderCode && (
              <div className="mt-2 text-xs text-text-muted">
                Work Order: <span className="font-mono text-text-primary">{result.workOrderCode}</span>
              </div>
            )}
            {result.nearbyDuplicate && (
              <div className="mt-2 rounded-lg bg-amber-500/10 p-2 text-xs text-amber-400">
                ⚠️ Similar issue reported nearby ({result.nearbyDuplicate.referenceCode}). Reports may be merged.
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <a
              href={"/" + locale + "/citizen/reports"}
              className="rounded-lg bg-accent-cyan px-6 py-2.5 text-sm font-medium text-base transition-all hover:bg-cyan-500"
            >
              View My Reports
            </a>
            <button
              onClick={() => { setResult(null); setStep(0); setLat(null); setLng(null); setCategory(null); setDescription(""); }}
              className="rounded-lg border border-border px-6 py-2.5 text-sm text-text-secondary hover:border-border-strong"
            >
              Report Another
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Report an Infrastructure Issue</h1>
        <p className="mt-1 text-xs text-text-muted">LIVE DEMO • SIMULATED TELEMETRY</p>
      </div>

      {/* Step Indicator */}
      <div className="mb-8 flex items-center justify-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <button
              onClick={() => { if (i < step) setStep(i); }}
              className={clsx(
                "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all",
                i === step ? "bg-accent-cyan text-base shadow-glow"
                  : i < step ? "bg-accent-cyan/20 text-accent-cyan"
                  : "bg-base-card text-text-muted"
              )}
            >
              {i < step ? "✓" : i + 1}
            </button>
            <span className={clsx("hidden text-xs sm:block", i === step ? "text-text-primary font-medium" : "text-text-muted")}>{s}</span>
            {i < STEPS.length - 1 && (
              <div className={clsx("mx-1 h-[2px] w-6 rounded-full", i < step ? "bg-accent-cyan" : "bg-base-card")} />
            )}
          </div>
        ))}
      </div>

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
              <h2 className="text-lg font-semibold text-text-primary">Select Location</h2>
              <LocationPicker
                lat={lat}
                lng={lng}
                onLocationChange={handleLocation}
                onError={() => {}}
              />
            </div>
          )}

          {/* Step 1: Category */}
          {step === 1 && (
            <div>
              <h2 className="mb-4 text-lg font-semibold text-text-primary">What is the issue?</h2>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {CATEGORIES.map(c => (
                  <button
                    key={c.value}
                    onClick={() => setCategory(c.value as Category)}
                    className={clsx(
                      "rounded-xl border p-3 text-left transition-all duration-200",
                      category === c.value
                        ? "border-accent-cyan/60 bg-accent-cyan/10"
                        : "border-border bg-base-elevated hover:border-border-strong"
                    )}
                  >
                    <span className="text-2xl">{c.icon}</span>
                    <p className="mt-2 text-xs font-semibold text-text-primary">{c.label}</p>
                    <p className="mt-0.5 text-[10px] text-text-muted">{c.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Description */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-text-primary">Describe the issue</h2>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe what you see — the more detail, the faster the resolution..."
                rows={5}
                maxLength={2000}
                className="w-full rounded-xl border border-border bg-base-elevated px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-cyan focus:outline-none focus:ring-1 focus:ring-accent-cyan"
              />
              <p className="text-right text-xs text-text-muted">{description.length} / 2000</p>
            </div>
          )}

          {/* Step 3: Confirm */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-text-primary">Confirm & Submit</h2>
              <div className="divide-y divide-border rounded-xl border border-border bg-base-elevated">
                <div className="flex justify-between px-4 py-3">
                  <span className="text-xs text-text-muted">Location</span>
                  <span className="font-mono text-xs text-accent-cyan">{lat?.toFixed(5)}, {lng?.toFixed(5)}</span>
                </div>
                <div className="flex justify-between px-4 py-3">
                  <span className="text-xs text-text-muted">Issue Type</span>
                  <span className="text-sm font-medium text-text-primary">
                    {CATEGORIES.find(c => c.value === category)?.icon} {CATEGORIES.find(c => c.value === category)?.label}
                  </span>
                </div>
                <div className="px-4 py-3">
                  <span className="text-xs text-text-muted">Description</span>
                  <p className="mt-1 text-sm text-text-primary">{description}</p>
                </div>
              </div>
              {error && (
                <p className="text-sm text-red-400">{error}</p>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="mt-6 flex justify-between">
        <button
          onClick={() => setStep(s => Math.max(0, s - 1))}
          disabled={step === 0}
          className="rounded-lg border border-border px-5 py-2.5 text-sm text-text-secondary hover:border-border-strong disabled:invisible"
        >
          ← Back
        </button>
        {step < 3 ? (
          <button
            onClick={() => setStep(s => s + 1)}
            disabled={step === 0 ? !lat || !lng : step === 1 ? !category : step === 2 ? description.trim().length < 5 : false}
            className="rounded-lg bg-accent-cyan px-5 py-2.5 text-sm font-medium text-base transition-all hover:bg-cyan-500 disabled:opacity-40"
          >
            Next →
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-2 rounded-lg bg-accent-cyan px-6 py-2.5 text-sm font-medium text-base transition-all hover:bg-cyan-500 disabled:opacity-60"
          >
            {submitting ? (
              <><span className="h-4 w-4 animate-spin rounded-full border-2 border-base border-t-transparent" />Submitting…</>
            ) : "Submit Report"}
          </button>
        )}
      </div>
    </div>
  );
}
