"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("admin"); // Reuse some generic terms or just use plain English with styling

  useEffect(() => {
    console.error("Dashboard caught error:", error);
  }, [error]);

  return (
    <div className="flex h-[80vh] w-full flex-col items-center justify-center text-center px-6">
      <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 max-w-md shadow-2xl">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20 mb-4">
          <span className="text-red-500 text-xl">!</span>
        </div>
        <h2 className="text-xl font-bold text-text-primary mb-2">Service Interruption</h2>
        <p className="text-sm text-text-secondary mb-6">
          A module encountered an unexpected error. The system administrator has been notified.
        </p>
        <button
          onClick={() => reset()}
          className="rounded-lg bg-base-elevated px-6 py-2 border border-border text-sm font-medium text-text-primary hover:bg-base-card transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
