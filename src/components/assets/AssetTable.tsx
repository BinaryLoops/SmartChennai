"use client";

import { motion } from "framer-motion";
import clsx from "clsx";
import { ChevronUp, ChevronDown } from "lucide-react";
import type { CityAssetRow, AssetStatus } from "@packages/types/assets";
import {
  CATEGORY_ICONS,
  ASSET_TYPE_LABELS,
  STATUS_COLORS,
} from "@packages/types/assets";
import { AssetStatusBadge } from "./AssetStatusBadge";

interface AssetTableProps {
  assets: CityAssetRow[];
  loading: boolean;
  onSelectAsset: (asset: CityAssetRow) => void;
  selectedId?: string | null;
  sort: string;
  dir: "asc" | "desc";
  onSort: (key: string) => void;
  noDataMessage?: string;
}

const HEALTH_COLOR = (score: number) => {
  if (score >= 80) return "text-accent-green";
  if (score >= 50) return "text-accent-amber";
  if (score >= 20) return "text-orange-400";
  return "text-accent-red";
};

const HEALTH_BAR = (score: number) => {
  if (score >= 80) return "bg-accent-green";
  if (score >= 50) return "bg-accent-amber";
  if (score >= 20) return "bg-orange-400";
  return "bg-accent-red";
};

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function SortableHeader({
  label, sortKey, currentSort, onSort,
}: {
  label: string; sortKey: string;
  currentSort: { key: string; dir: "asc" | "desc" };
  onSort: (k: string) => void;
}) {
  const active = currentSort.key === sortKey;
  return (
    <th
      className="cursor-pointer whitespace-nowrap px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-text-muted transition-colors hover:text-text-primary"
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        {label}
        <span className={clsx("ml-0.5", active ? "text-accent-cyan" : "text-transparent")}>
          {currentSort.dir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </span>
      </div>
    </th>
  );
}

export function AssetTable({
  assets, loading, onSelectAsset, selectedId, sort, dir, onSort, noDataMessage,
}: AssetTableProps) {
  if (loading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="skeleton h-12 rounded-lg" />
        ))}
      </div>
    );
  }

  if (!assets.length) {
    return (
      <div className="py-16 text-center text-text-muted">
        <p className="text-4xl mb-3">🔍</p>
        <p className="text-sm">{noDataMessage ?? "No assets found matching the filters."}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10 border-b border-border bg-base-card">
          <tr>
            <SortableHeader label="Code"    sortKey="assetCode"   currentSort={{ key: sort, dir }} onSort={onSort} />
            <SortableHeader label="Name"    sortKey="name"        currentSort={{ key: sort, dir }} onSort={onSort} />
            <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-text-muted">Type</th>
            <SortableHeader label="Zone"    sortKey="zone"        currentSort={{ key: sort, dir }} onSort={onSort} />
            <SortableHeader label="Status"  sortKey="status"      currentSort={{ key: sort, dir }} onSort={onSort} />
            <SortableHeader label="Health"  sortKey="healthScore" currentSort={{ key: sort, dir }} onSort={onSort} />
            <SortableHeader label="Updated" sortKey="updatedAt"   currentSort={{ key: sort, dir }} onSort={onSort} />
          </tr>
        </thead>
        <tbody>
          {assets.map((asset, idx) => {
            const isSelected = asset.id === selectedId;
            return (
              <motion.tr
                key={asset.id}
                layout
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.01 }}
                onClick={() => onSelectAsset(asset)}
                className={clsx(
                  "group cursor-pointer border-b border-border transition-all",
                  isSelected
                    ? "bg-accent-cyan/8 border-l-2 border-l-accent-cyan"
                    : "hover:bg-accent-cyan/4"
                )}
              >
                {/* Code */}
                <td className="whitespace-nowrap px-5 py-3">
                  <span className="font-mono text-xs font-semibold text-accent-cyan">
                    {asset.assetCode}
                  </span>
                </td>

                {/* Name with category icon */}
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-base leading-none">
                      {CATEGORY_ICONS[asset.category]}
                    </span>
                    <span className="font-medium text-text-primary line-clamp-1 max-w-[220px]">
                      {asset.name}
                    </span>
                    {asset.isDemo && (
                      <span className="hidden text-[10px] text-text-muted group-hover:inline">
                        DEMO
                      </span>
                    )}
                  </div>
                </td>

                {/* Type */}
                <td className="whitespace-nowrap px-5 py-3 text-text-secondary">
                  {ASSET_TYPE_LABELS[asset.assetType] ?? asset.assetType}
                </td>

                {/* Zone */}
                <td className="whitespace-nowrap px-5 py-3 text-text-secondary">
                  {asset.zoneName ?? "—"}
                </td>

                {/* Status */}
                <td className="whitespace-nowrap px-5 py-3">
                  <AssetStatusBadge status={asset.status as any} />
                </td>

                {/* Health */}
                <td className="whitespace-nowrap px-5 py-3">
                  <div className="flex items-center gap-2">
                    <span className={clsx("w-7 font-mono text-xs font-semibold", HEALTH_COLOR(asset.healthScore))}>
                      {asset.healthScore}
                    </span>
                    <div className="h-1.5 w-14 overflow-hidden rounded-full bg-base">
                      <div
                        className={clsx("h-full transition-all", HEALTH_BAR(asset.healthScore))}
                        style={{ width: `${asset.healthScore}%` }}
                      />
                    </div>
                  </div>
                </td>

                {/* Updated */}
                <td className="whitespace-nowrap px-5 py-3 text-text-muted">
                  {formatRelativeTime(asset.lastSeenAt)}
                </td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
