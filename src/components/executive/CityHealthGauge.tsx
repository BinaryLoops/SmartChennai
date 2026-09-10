"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

interface CityHealthGaugeProps {
  score: number;
}

export function CityHealthGauge({ score }: CityHealthGaugeProps) {
  const t = useTranslations("executive");
  const radius = 120;
  const strokeWidth = 24;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  let color = "text-accent-green";
  let bgGradient = "from-accent-green/20 to-transparent";
  if (score < 60) {
    color = "text-accent-red";
    bgGradient = "from-accent-red/20 to-transparent";
  } else if (score < 80) {
    color = "text-accent-amber";
    bgGradient = "from-accent-amber/20 to-transparent";
  }

  return (
    <div className="relative flex flex-col items-center justify-center rounded-card border border-border bg-base-elevated p-8 shadow-lg">
      <h2 className="mb-6 text-lg font-bold uppercase tracking-wider text-text-primary">
        {t("cityHealthScore")}
      </h2>
      <div className={`absolute inset-0 bg-gradient-to-b ${bgGradient} rounded-card opacity-50 pointer-events-none`} />

      <div className="relative flex items-center justify-center group">
        <svg width="280" height="280" className="transform -rotate-90">
          <circle
            cx="140"
            cy="140"
            r={radius}
            className="stroke-border fill-transparent"
            strokeWidth={strokeWidth}
          />
          <motion.circle
            cx="140"
            cy="140"
            r={radius}
            className={`fill-transparent ${color} stroke-current drop-shadow-[0_0_10px_rgba(currentColor,0.5)]`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center">
          <span className="font-mono text-6xl font-black text-text-primary drop-shadow-md">
            {score}
          </span>
          <span className="text-sm font-medium text-text-muted">/ 100</span>
        </div>

        {/* Hover Tooltip with Factors */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[220px] rounded-lg border border-border bg-base-card/95 backdrop-blur-md p-4 opacity-0 transition-opacity group-hover:opacity-100 shadow-xl pointer-events-none z-10 hidden md:block">
          <h4 className="text-xs font-bold uppercase text-text-secondary border-b border-border/50 pb-2 mb-2">Health Formula</h4>
          <ul className="space-y-1 text-xs text-text-muted">
            <li className="flex justify-between"><span>{t("healthFactors.traffic")}</span></li>
            <li className="flex justify-between"><span>{t("healthFactors.response")}</span></li>
            <li className="flex justify-between"><span>{t("healthFactors.flood")}</span></li>
            <li className="flex justify-between"><span>{t("healthFactors.incidents")}</span></li>
            <li className="flex justify-between"><span>{t("healthFactors.citizen")}</span></li>
          </ul>
        </div>
      </div>
    </div>
  );
}
