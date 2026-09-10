"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import { Card } from "@/components/ui/Card";
import clsx from "clsx";

interface QueueMetrics {
  name: string;
  depth: number;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  isPaused: boolean;
  avgProcessingLagMs: number;
}

interface RedisMetrics {
  ok: boolean;
  latencyMs?: number;
  error?: string;
}

interface RecentJob {
  id: string;
  referenceId: string;
  type: string;
  source: string;
  severity: number;
  state: string;
  durationMs: number | null;
  queueLagMs: number;
  timestamp: number;
  submittedAt?: string;
  result?: {
    status: "created" | "merged";
    incidentId: string;
    reportedBy: number;
    priorityScore: number;
  };
  failedReason?: string;
}

interface HistoryPoint {
  time: string;
  depth: number;
  lag: number;
}

const STATE_COLORS: Record<string, string> = {
  waiting: "#f59e0b", // amber
  active: "#06b6d4", // cyan
  completed: "#10b981", // emerald
  failed: "#ef4444", // rose
};

export default function QueueHealthPage() {
  const [metrics, setMetrics] = useState<QueueMetrics | null>(null);
  const [redis, setRedis] = useState<RedisMetrics | null>(null);
  const [recentJobs, setRecentJobs] = useState<RecentJob[]>([]);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const historyRef = useRef<HistoryPoint[]>([]);

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/queue-health");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      setMetrics(data.queue);
      setRedis(data.redis);
      setRecentJobs(data.recentJobs || []);

      // Append to history for real-time charts (keep last 25 points)
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now
        .getMinutes()
        .toString()
        .padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;

      const newPoint: HistoryPoint = {
        time: timeStr,
        depth: data.queue?.depth ?? 0,
        lag: data.queue?.avgProcessingLagMs ?? 0,
      };

      const nextHistory = [...historyRef.current, newPoint].slice(-25);
      historyRef.current = nextHistory;
      setHistory(nextHistory);
      setLoading(false);
    } catch (err) {
      console.error("[QueueHealth] Fetch failed:", err);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    if (!autoRefresh) return;
    const interval = setInterval(fetchMetrics, 2000);
    return () => clearInterval(interval);
  }, [fetchMetrics, autoRefresh]);

  const handleQueueAction = async (action: "pause" | "resume" | "clean") => {
    try {
      setActionLoading(action);
      setActionMsg(null);
      const res = await fetch("/api/admin/queue-health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMsg(data.message || "Action completed successfully");
        await fetchMetrics();
      } else {
        setActionMsg(data.error || "Action failed");
      }
    } catch (err: any) {
      setActionMsg(err.message || "Action request error");
    } finally {
      setActionLoading(null);
      setTimeout(() => setActionMsg(null), 4000);
    }
  };

  const jobDistribution = metrics
    ? [
        { name: "Waiting", count: metrics.waiting, color: STATE_COLORS.waiting },
        { name: "Active", count: metrics.active, color: STATE_COLORS.active },
        { name: "Completed", count: metrics.completed, color: STATE_COLORS.completed },
        { name: "Failed", count: metrics.failed, color: STATE_COLORS.failed },
      ]
    : [];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">
              Incident Intake Queue Health
            </h1>
            <span
              className={clsx(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                metrics?.isPaused
                  ? "bg-amber-500/15 text-accent-amber border border-amber-500/30"
                  : "bg-emerald-500/15 text-accent-green border border-emerald-500/30"
              )}
            >
              <span
                className={clsx(
                  "mr-1.5 h-2 w-2 rounded-full",
                  metrics?.isPaused ? "bg-amber-400" : "bg-emerald-400 animate-pulse"
                )}
              />
              {metrics?.isPaused ? "QUEUE PAUSED" : "QUEUE OPERATIONAL"}
            </span>

            <span
              className={clsx(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border",
                redis?.ok
                  ? "bg-cyan-500/15 text-accent-cyan border-cyan-500/30"
                  : "bg-rose-500/15 text-accent-red border-rose-500/30"
              )}
            >
              REDIS: {redis?.ok ? `ONLINE (${redis.latencyMs?.toFixed(1) ?? "1.0"}ms)` : "DISCONNECTED"}
            </span>
          </div>
          <p className="mt-1 text-sm text-text-secondary">
            BullMQ Asynchronous Ingestion &amp; 50m/5min Haversine Deduplication Telemetry
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setAutoRefresh((v) => !v)}
            className={clsx(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors border",
              autoRefresh
                ? "bg-accent-cyan/20 text-accent-cyan border-accent-cyan/40"
                : "bg-base-elevated text-text-secondary border-border hover:text-text-primary"
            )}
          >
            {autoRefresh ? "● Polling Live (2s)" : "○ Polling Paused"}
          </button>

          <button
            onClick={() => fetchMetrics()}
            disabled={loading}
            className="rounded-lg border border-border bg-base-card px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-base-elevated hover:text-text-primary transition-colors"
          >
            Refresh
          </button>

          {metrics?.isPaused ? (
            <button
              onClick={() => handleQueueAction("resume")}
              disabled={Boolean(actionLoading)}
              className="rounded-lg bg-emerald-600/20 border border-emerald-500/40 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-600/30 transition-colors"
            >
              {actionLoading === "resume" ? "Resuming..." : "Resume Intake"}
            </button>
          ) : (
            <button
              onClick={() => handleQueueAction("pause")}
              disabled={Boolean(actionLoading)}
              className="rounded-lg bg-amber-600/20 border border-amber-500/40 px-3 py-1.5 text-xs font-medium text-amber-400 hover:bg-amber-600/30 transition-colors"
            >
              {actionLoading === "pause" ? "Pausing..." : "Pause Intake"}
            </button>
          )}

          <button
            onClick={() => handleQueueAction("clean")}
            disabled={Boolean(actionLoading)}
            className="rounded-lg border border-border bg-base-card px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-base-elevated hover:text-accent-red transition-colors"
          >
            {actionLoading === "clean" ? "Cleaning..." : "Clean Completed"}
          </button>
        </div>
      </div>

      {/* Action Feedback Banner */}
      <AnimatePresence>
        {actionMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-lg border border-accent-cyan/30 bg-accent-cyan/10 px-4 py-2 text-xs font-medium text-accent-cyan"
          >
            {actionMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Key Metric Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* Card 1: Queue Depth */}
        <Card className="flex flex-col justify-between">
          <p className="text-xs uppercase tracking-wider text-text-secondary">Queue Depth</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-accent-cyan">
              {metrics?.depth ?? 0}
            </span>
            <span className="text-xs text-text-secondary">jobs in flight</span>
          </div>
          <div className="mt-3 flex gap-2 text-xs text-text-secondary">
            <span>Wait: <strong className="text-amber-400">{metrics?.waiting ?? 0}</strong></span>
            <span>•</span>
            <span>Active: <strong className="text-cyan-400">{metrics?.active ?? 0}</strong></span>
          </div>
        </Card>

        {/* Card 2: Processing Lag */}
        <Card className="flex flex-col justify-between">
          <p className="text-xs uppercase tracking-wider text-text-secondary">Avg Processing Lag</p>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-3xl font-bold text-accent-amber">
              {metrics?.avgProcessingLagMs ?? 0}
            </span>
            <span className="text-xs text-text-secondary">ms</span>
          </div>
          <p className="mt-3 text-xs text-text-secondary">Intake-to-worker dispatch</p>
        </Card>

        {/* Card 3: Completed Jobs */}
        <Card className="flex flex-col justify-between">
          <p className="text-xs uppercase tracking-wider text-text-secondary">Processed Jobs</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-accent-green">
              {metrics?.completed ?? 0}
            </span>
            <span className="text-xs text-text-secondary">ingested</span>
          </div>
          <p className="mt-3 text-xs text-text-secondary">Total lifetime completed</p>
        </Card>

        {/* Card 4: Failed Jobs */}
        <Card className="flex flex-col justify-between">
          <p className="text-xs uppercase tracking-wider text-text-secondary">Failed Jobs</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={clsx(
                "text-3xl font-bold",
                (metrics?.failed ?? 0) > 0 ? "text-accent-red" : "text-text-primary"
              )}
            >
              {metrics?.failed ?? 0}
            </span>
            <span className="text-xs text-text-secondary">errors</span>
          </div>
          <p className="mt-3 text-xs text-text-secondary">Automatic 3x exponential retry</p>
        </Card>

        {/* Card 5: Rate Limiting Policy */}
        <Card className="flex flex-col justify-between">
          <p className="text-xs uppercase tracking-wider text-text-secondary">Intake Policy</p>
          <div className="mt-2">
            <p className="text-xl font-bold text-text-primary">100 / 15m</p>
            <p className="text-xs text-text-secondary">IP sliding window rate limit</p>
          </div>
          <p className="mt-3 text-xs text-accent-cyan">50m / 5m deduplication</p>
        </Card>
      </div>

      {/* Recharts Telemetry Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Real-time Queue Depth & Lag Chart (2 cols) */}
        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-text-primary">
                Queue Depth &amp; Processing Lag Stream
              </h2>
              <p className="text-xs text-text-secondary">Real-time polling trend over the last 60 seconds</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-text-secondary">
                <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
                Depth
              </span>
              <span className="flex items-center gap-1.5 text-text-secondary">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                Lag (ms)
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            {history.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="depthGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="lagGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                  <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderColor: "#334155",
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: "#f8fafc",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="depth"
                    name="Queue Depth"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#depthGradient)"
                  />
                  <Area
                    type="monotone"
                    dataKey="lag"
                    name="Processing Lag (ms)"
                    stroke="#f59e0b"
                    strokeWidth={1.5}
                    fillOpacity={1}
                    fill="url(#lagGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-text-secondary">
                Awaiting telemetry stream...
              </div>
            )}
          </div>
        </Card>

        {/* Job State Distribution (1 col) */}
        <Card>
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-text-primary">Job State Distribution</h2>
            <p className="text-xs text-text-secondary">Live breakdown across worker queues</p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={jobDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderColor: "#334155",
                    borderRadius: "8px",
                    fontSize: "12px",
                    color: "#f8fafc",
                  }}
                />
                <Bar dataKey="count" name="Jobs" radius={[4, 4, 0, 0]}>
                  {jobDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Recent Incident Ingestion Jobs Table */}
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-text-primary">
              Recent Ingested Incident Submissions
            </h2>
            <p className="text-xs text-text-secondary">
              Processed through BullMQ intake worker with Haversine deduplication &amp; MCDA scoring
            </p>
          </div>
          <span className="text-xs text-text-secondary">
            Showing latest {recentJobs.length} jobs
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-text-primary">
            <thead className="border-b border-border bg-base-elevated/40 text-text-secondary uppercase">
              <tr>
                <th className="px-3 py-2.5">Reference ID</th>
                <th className="px-3 py-2.5">Type</th>
                <th className="px-3 py-2.5">Source</th>
                <th className="px-3 py-2.5">Severity</th>
                <th className="px-3 py-2.5">State</th>
                <th className="px-3 py-2.5">Deduplication Status</th>
                <th className="px-3 py-2.5">Processing Lag</th>
                <th className="px-3 py-2.5">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {recentJobs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-text-secondary">
                    No recent incident jobs recorded in queue. Submissions via POST /api/incidents will appear here in real-time.
                  </td>
                </tr>
              ) : (
                recentJobs.map((job) => {
                  const isMerged = job.result?.status === "merged";
                  return (
                    <tr key={job.id} className="hover:bg-base-elevated/30 transition-colors">
                      <td className="px-3 py-2 font-mono text-xs font-semibold text-accent-cyan">
                        {job.referenceId}
                      </td>
                      <td className="px-3 py-2 capitalize">
                        <span
                          className={clsx(
                            "inline-block rounded px-2 py-0.5 text-[10px] font-medium",
                            job.type === "fire"
                              ? "bg-rose-500/20 text-rose-300"
                              : job.type === "medical"
                              ? "bg-emerald-500/20 text-emerald-300"
                              : job.type === "flood"
                              ? "bg-blue-500/20 text-blue-300"
                              : "bg-amber-500/20 text-amber-300"
                          )}
                        >
                          {job.type}
                        </span>
                      </td>
                      <td className="px-3 py-2 capitalize text-text-secondary">
                        {job.source}
                      </td>
                      <td className="px-3 py-2">
                        <span className="font-semibold text-text-primary">
                          Lv {job.severity}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={clsx(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium capitalize",
                            job.state === "completed"
                              ? "bg-emerald-500/15 text-accent-green"
                              : job.state === "active"
                              ? "bg-cyan-500/15 text-accent-cyan animate-pulse"
                              : job.state === "waiting"
                              ? "bg-amber-500/15 text-accent-amber"
                              : "bg-rose-500/15 text-accent-red"
                          )}
                        >
                          {job.state}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {isMerged ? (
                          <span className="inline-flex items-center gap-1 rounded bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 text-[10px] font-medium text-purple-300">
                            Merged ({job.result?.reportedBy} reported)
                          </span>
                        ) : job.result ? (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-400">
                            New (MCDA: {job.result.priorityScore})
                          </span>
                        ) : (
                          <span className="text-text-secondary">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 font-mono text-text-secondary">
                        {typeof job.durationMs === "number" ? `${job.durationMs}ms` : "—"}
                      </td>
                      <td className="px-3 py-2 text-text-secondary">
                        {job.submittedAt
                          ? new Date(job.submittedAt).toLocaleTimeString()
                          : new Date(job.timestamp).toLocaleTimeString()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Queue Architecture Diagnostics Card */}
      <Card className="border-border bg-base-elevated/40">
        <h3 className="text-xs uppercase tracking-wider font-semibold text-text-secondary mb-3">
          Phase 4.5 Intake Architecture Diagnostics &amp; Parameters
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 text-xs text-text-secondary">
          <div className="border-l-2 border-accent-cyan pl-3">
            <p className="font-semibold text-text-primary">Rate Limiting Rule</p>
            <p className="mt-0.5">100 requests / 15 minutes per IP address via Redis sliding window counter.</p>
          </div>
          <div className="border-l-2 border-accent-amber pl-3">
            <p className="font-semibold text-text-primary">Duplicate Suppression</p>
            <p className="mt-0.5">50m radius (Haversine distance) &amp; 5-minute time window on matching incident types.</p>
          </div>
          <div className="border-l-2 border-accent-green pl-3">
            <p className="font-semibold text-text-primary">MCDA Scoring Formula</p>
            <p className="mt-0.5">Severity (40%) + Source Reliability (25%) + Location Criticality (35%) -&gt; Priority (0–100).</p>
          </div>
          <div className="border-l-2 border-purple-400 pl-3">
            <p className="font-semibold text-text-primary">Socket.io Multi-Process</p>
            <p className="mt-0.5">@socket.io/redis-adapter broadcasts incident:new &amp; incident:updated across all nodes.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
