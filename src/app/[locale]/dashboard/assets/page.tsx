"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import {
  Search, Filter, RefreshCw, LayoutList, Map, Radio,
  ChevronLeft, ChevronRight, SlidersHorizontal, X,
} from "lucide-react";
import clsx from "clsx";

import { Card } from "@/components/ui/Card";
import { KpiCard } from "@/components/ui/KpiCard";
import { DemoIndicator } from "@/components/dashboard/extended/DemoIndicator";
import { AssetTable } from "@/components/assets/AssetTable";
import { AssetDetailPanel } from "@/components/assets/AssetDetailPanel";

import type {
  CityAssetRow, AssetCategory, AssetStatus,
  AssetListResponse, AssetStatsResponse,
} from "@packages/types/assets";
import { CATEGORY_ICONS, CATEGORY_LABELS } from "@packages/types/assets";

// Dynamic import for the map (Leaflet is SSR-incompatible)
const AssetMapView = dynamic(
  () => import("@/components/assets/AssetMapView").then(m => m.AssetMapView),
  { ssr: false, loading: () => <div className="h-full w-full skeleton rounded-xl" /> }
);

const ALL_CATEGORIES: AssetCategory[] = [
  "MOBILITY", "WATER", "SAFETY", "HEALTHCARE",
  "ENVIRONMENT", "WASTE", "ENERGY", "PUBLIC_FACILITIES", "PROJECTS",
];

const ALL_STATUSES: AssetStatus[] = ["HEALTHY", "DEGRADED", "OFFLINE", "MAINTENANCE", "UNKNOWN"];
const PAGE_SIZE = 20;
const POLL_INTERVAL_MS = 20_000; // refresh every 20s for live feel

type ViewMode = "table" | "map";

export default function AssetRegistryPage() {
  const t = useTranslations("assets");

  // ── Filter / pagination state ──────────────────────────────────────────
  const [search,   setSearch]   = useState("");
  const [category, setCategory] = useState<AssetCategory | "">("");
  const [status,   setStatus]   = useState<AssetStatus | "">("");
  const [zone,     setZone]     = useState("");
  const [sort,     setSort]     = useState("updatedAt");
  const [dir,      setDir]      = useState<"asc" | "desc">("desc");
  const [page,     setPage]     = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>("table");

  // ── Data state ────────────────────────────────────────────────────────
  const [listData,  setListData]  = useState<AssetListResponse | null>(null);
  const [stats,     setStats]     = useState<AssetStatsResponse | null>(null);
  const [zones,     setZones]     = useState<{ id: string; name: string }[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const searchDebounceRef = useRef<NodeJS.Timeout>();

  // ── Build query URL ───────────────────────────────────────────────────
  const buildQuery = useCallback((pageNum: number) => {
    const p = new URLSearchParams();
    p.set("page", String(pageNum));
    p.set("limit", String(PAGE_SIZE));
    p.set("sort", sort);
    p.set("dir", dir);
    if (search)   p.set("search",   search);
    if (category) p.set("category", category);
    if (status)   p.set("status",   status);
    if (zone)     p.set("zone",     zone);
    return `/api/assets?${p.toString()}`;
  }, [search, category, status, zone, sort, dir]);

  // ── Fetch assets ──────────────────────────────────────────────────────
  const fetchAssets = useCallback(async (pageNum: number, showLoader = false) => {
    if (showLoader) setLoading(true);
    setIsRefreshing(true);
    try {
      const res = await fetch(buildQuery(pageNum));
      const data: AssetListResponse = await res.json();
      setListData(data);
      setLastRefresh(new Date());
    } catch (e) {
      console.error("[assets] fetch error:", e);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [buildQuery]);

  // ── Fetch stats ───────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/assets/stats");
      const data: AssetStatsResponse = await res.json();
      setStats(data);
      setStatsLoading(false);
    } catch (e) {
      console.error("[assets] stats error:", e);
    }
  }, []);

  // ── Fetch zones for filter dropdown ───────────────────────────────────
  useEffect(() => {
    fetch("/api/dashboard/initial")
      .then(r => r.json())
      .then(d => setZones(d.zones || []))
      .catch(() => {});
  }, []);

  // ── Initial load ──────────────────────────────────────────────────────
  useEffect(() => {
    fetchAssets(1, true);
    fetchStats();
  }, []);

  // ── Refetch when filters change (debounce search) ─────────────────────
  useEffect(() => {
    clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setPage(1);
      fetchAssets(1, false);
      fetchStats();
    }, 350);
    return () => clearTimeout(searchDebounceRef.current);
  }, [search, category, status, zone, sort, dir]);

  // ── Live polling — 20s refresh to show changing asset states ─────────
  useEffect(() => {
    const timer = setInterval(() => {
      fetchAssets(page, false);
      fetchStats();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [page, fetchAssets, fetchStats]);

  // ── Handle sort changes ───────────────────────────────────────────────
  const handleSort = (key: string) => {
    setSort(prev => {
      if (prev === key) { setDir(d => d === "desc" ? "asc" : "desc"); return key; }
      setDir("desc");
      return key;
    });
  };

  // ── Handle page changes ───────────────────────────────────────────────
  const goToPage = (p: number) => {
    setPage(p);
    fetchAssets(p, false);
  };

  const assets = listData?.assets ?? [];
  const total  = listData?.total  ?? 0;
  const pages  = listData?.pages  ?? 1;

  // Seconds since last refresh
  const [secAgo, setSecAgo] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSecAgo(Math.floor((Date.now() - lastRefresh.getTime()) / 1000)), 1000);
    return () => clearInterval(t);
  }, [lastRefresh]);

  const selectedAsset = assets.find(a => a.id === selectedId) ?? null;

  return (
    <div className="flex flex-col gap-5">
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">{t("pageTitle")}</h1>
          <p className="text-sm text-text-muted mt-0.5">{t("pageSubtitle")}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Refresh indicator */}
          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <span className={clsx("h-1.5 w-1.5 rounded-full", isRefreshing ? "bg-accent-cyan animate-pulse" : "bg-accent-green")} />
            {isRefreshing ? "Refreshing..." : `Updated ${secAgo}s ago`}
          </div>
          <button
            onClick={() => { fetchAssets(page, false); fetchStats(); }}
            className="rounded-lg border border-border p-2 text-text-muted transition-colors hover:border-accent-cyan hover:text-accent-cyan"
            title="Refresh"
          >
            <RefreshCw size={14} className={clsx(isRefreshing && "animate-spin")} />
          </button>
          <DemoIndicator />
        </div>
      </div>

      {/* ── KPI Cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <KpiCard label={t("kpiTotal")}       value={stats?.total       ?? 0} accent="cyan"  />
        <KpiCard label={t("kpiHealthy")}     value={stats?.healthy     ?? 0} accent="green" />
        <KpiCard label={t("kpiDegraded")}    value={stats?.degraded    ?? 0} accent="amber" />
        <KpiCard label={t("kpiOffline")}     value={stats?.offline     ?? 0} accent="red"   />
        <KpiCard label={t("kpiMaintenance")} value={stats?.maintenance ?? 0} accent="cyan"  />
      </div>

      {/* ── Category breakdown chips ─────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setCategory("")}
          className={clsx(
            "rounded-full px-3 py-1.5 text-xs font-medium border transition-all",
            category === ""
              ? "bg-accent-cyan/15 border-accent-cyan/40 text-accent-cyan"
              : "border-border text-text-muted hover:border-border-strong hover:text-text-primary"
          )}
        >
          All ({stats?.total ?? 0})
        </button>
        {ALL_CATEGORIES.map(cat => {
          const count = stats?.byCategory.find(b => b.category === cat)?.count ?? 0;
          if (count === 0) return null;
          return (
            <button
              key={cat}
              onClick={() => setCategory(c => c === cat ? "" : cat)}
              className={clsx(
                "rounded-full px-3 py-1.5 text-xs font-medium border transition-all flex items-center gap-1.5",
                category === cat
                  ? "bg-accent-cyan/15 border-accent-cyan/40 text-accent-cyan"
                  : "border-border text-text-muted hover:border-border-strong hover:text-text-primary"
              )}
            >
              <span>{CATEGORY_ICONS[cat]}</span>
              {CATEGORY_LABELS[cat]}
              <span className="rounded-full bg-base-elevated px-1.5 py-0.5 text-[10px] font-bold">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Main content area ─────────────────────────────────────────── */}
      <div className={clsx("flex gap-4", selectedId && "min-h-[600px]")}>
        {/* Left: Table/Map */}
        <div className={clsx("flex flex-col gap-4 transition-all", selectedId ? "flex-1" : "w-full")}>
          {/* Search + filters row */}
          <Card>
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative flex-1 min-w-[180px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={t("searchPlaceholder")}
                  className="w-full rounded-lg border border-border bg-base pl-9 pr-3 py-2 text-sm text-text-primary placeholder-text-muted focus:border-accent-cyan focus:outline-none transition-colors"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary">
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Status filter */}
              <select
                value={status}
                onChange={e => setStatus(e.target.value as any)}
                className="rounded-lg border border-border bg-base px-3 py-2 text-sm text-text-primary focus:border-accent-cyan focus:outline-none"
              >
                <option value="">{t("filterAllStatus")}</option>
                {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>

              {/* Zone filter */}
              <select
                value={zone}
                onChange={e => setZone(e.target.value)}
                className="rounded-lg border border-border bg-base px-3 py-2 text-sm text-text-primary focus:border-accent-cyan focus:outline-none"
              >
                <option value="">{t("filterAllZones")}</option>
                {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>

              {/* View toggle */}
              <div className="flex rounded-lg border border-border overflow-hidden ml-auto">
                <button
                  onClick={() => setViewMode("table")}
                  className={clsx("px-3 py-2 text-xs font-medium flex items-center gap-1.5 transition-colors",
                    viewMode === "table" ? "bg-accent-cyan/15 text-accent-cyan" : "text-text-muted hover:text-text-primary"
                  )}
                >
                  <LayoutList size={13} /> Table
                </button>
                <button
                  onClick={() => setViewMode("map")}
                  className={clsx("px-3 py-2 text-xs font-medium flex items-center gap-1.5 transition-colors border-l border-border",
                    viewMode === "map" ? "bg-accent-cyan/15 text-accent-cyan" : "text-text-muted hover:text-text-primary"
                  )}
                >
                  <Map size={13} /> Map
                </button>
              </div>
            </div>

            {/* Active filters pill display */}
            {(search || category || status || zone) && (
              <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border">
                <span className="text-xs text-text-muted flex items-center gap-1"><Filter size={11} /> Filters:</span>
                {search   && <FilterPill label={`Search: "${search}"`}           onRemove={() => setSearch("")} />}
                {category && <FilterPill label={`${CATEGORY_LABELS[category]}`}  onRemove={() => setCategory("")} />}
                {status   && <FilterPill label={status}                           onRemove={() => setStatus("")} />}
                {zone     && <FilterPill label={zones.find(z => z.id === zone)?.name ?? zone} onRemove={() => setZone("")} />}
                <button onClick={() => { setSearch(""); setCategory(""); setStatus(""); setZone(""); }} className="text-xs text-accent-red hover:underline">
                  Clear all
                </button>
              </div>
            )}
          </Card>

          {/* Table or Map */}
          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <span className="text-sm font-medium text-text-primary">
                {total.toLocaleString()} {t("assetsFound")}
                {(search || category || status || zone) && <span className="text-text-muted ml-1">(filtered)</span>}
              </span>
            </div>

            {viewMode === "table" ? (
              <AssetTable
                assets={assets}
                loading={loading}
                onSelectAsset={a => setSelectedId(id => id === a.id ? null : a.id)}
                selectedId={selectedId}
                sort={sort}
                dir={dir}
                onSort={handleSort}
                noDataMessage={t("noAssetsFound")}
              />
            ) : (
              <div className="h-[520px]">
                <AssetMapView
                  assets={assets}
                  selectedId={selectedId}
                  onSelectAsset={a => setSelectedId(id => id === a.id ? null : a.id)}
                />
              </div>
            )}

            {/* Pagination */}
            {viewMode === "table" && pages > 1 && (
              <div className="flex items-center justify-between border-t border-border px-5 py-3">
                <span className="text-xs text-text-muted">
                  {t("showingPage", { page, pages, total })}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => goToPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="rounded-lg border border-border p-1.5 text-text-muted transition-colors hover:border-accent-cyan hover:text-accent-cyan disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  {Array.from({ length: Math.min(7, pages) }, (_, i) => {
                    let p: number;
                    if (pages <= 7)         p = i + 1;
                    else if (page <= 4)     p = i + 1;
                    else if (page >= pages - 3) p = pages - 6 + i;
                    else p = page - 3 + i;
                    return (
                      <button
                        key={p}
                        onClick={() => goToPage(p)}
                        className={clsx(
                          "h-7 w-7 rounded-lg text-xs font-medium transition-colors",
                          p === page
                            ? "bg-accent-cyan text-base font-bold"
                            : "text-text-muted hover:bg-base-elevated hover:text-text-primary"
                        )}
                      >
                        {p}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => goToPage(Math.min(pages, page + 1))}
                    disabled={page === pages}
                    className="rounded-lg border border-border p-1.5 text-text-muted transition-colors hover:border-accent-cyan hover:text-accent-cyan disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Right: Detail panel */}
        <AnimatePresence>
          {selectedId && (
            <motion.div
              key="detail"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 380, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="flex-shrink-0 overflow-hidden"
            >
              <div className="w-[380px] h-full">
                <AssetDetailPanel
                  assetId={selectedId}
                  onClose={() => setSelectedId(null)}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Small helper component for active filter pills
function FilterPill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-cyan/10 border border-accent-cyan/30 px-2.5 py-0.5 text-xs text-accent-cyan">
      {label}
      <button onClick={onRemove} className="hover:text-white"><X size={10} /></button>
    </span>
  );
}
