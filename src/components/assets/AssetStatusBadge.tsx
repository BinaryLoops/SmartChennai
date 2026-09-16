"use client";

import clsx from "clsx";
import type { AssetStatus } from "@packages/types/assets";
import { STATUS_BG, STATUS_DOT } from "@packages/types/assets";

interface AssetStatusBadgeProps {
  status: AssetStatus;
  pulse?: boolean;
  size?: "sm" | "md";
}

const STATUS_LABELS: Record<AssetStatus, string> = {
  HEALTHY:     "Healthy",
  DEGRADED:    "Degraded",
  OFFLINE:     "Offline",
  MAINTENANCE: "Maintenance",
  UNKNOWN:     "Unknown",
};

export function AssetStatusBadge({ status, pulse = false, size = "sm" }: AssetStatusBadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 font-medium",
        size === "sm" ? "py-0.5 text-xs" : "py-1 text-sm",
        STATUS_BG[status]
      )}
    >
      <span
        className={clsx(
          "rounded-full flex-shrink-0",
          size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2",
          STATUS_DOT[status],
          pulse && status === "HEALTHY" && "animate-pulse",
          pulse && status === "OFFLINE" && "animate-pulse",
        )}
      />
      {STATUS_LABELS[status]}
    </span>
  );
}
