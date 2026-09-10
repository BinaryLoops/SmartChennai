"use client";

import { useTranslations } from "next-intl";

interface ZoneScore {
  id: string;
  name: string;
  score: number;
}

interface ZoneHealthGridProps {
  zones: ZoneScore[];
}

export function ZoneHealthGrid({ zones }: ZoneHealthGridProps) {
  const t = useTranslations("executive");

  return (
    <div className="flex flex-col rounded-card border border-border bg-base-card p-5 shadow-lg h-full">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-text-primary">
        {t("zoneHealth")}
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 overflow-y-auto max-h-[300px] pr-2">
        {zones.map((zone) => {
          let bgColor = "bg-accent-green/10 border-accent-green/30 text-accent-green";
          if (zone.score < 60) {
            bgColor = "bg-accent-red/10 border-accent-red/50 text-accent-red shadow-[0_0_10px_rgba(239,68,68,0.2)]";
          } else if (zone.score < 80) {
            bgColor = "bg-accent-amber/10 border-accent-amber/50 text-accent-amber";
          }

          return (
            <div
              key={zone.id}
              className={`flex flex-col items-center justify-center rounded-lg border p-3 transition-colors ${bgColor}`}
            >
              <span className="text-xs font-bold text-center text-text-primary mb-1">
                {zone.name}
              </span>
              <span className="font-mono text-xl font-bold">
                {zone.score}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
