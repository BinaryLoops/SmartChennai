"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import clsx from "clsx";

const TYPES = [
  { key: "traffic", icon: "🚗", color: "from-amber-500/20 to-amber-600/10", border: "border-amber-500/40", glow: "shadow-[0_0_20px_rgba(245,158,11,0.3)]" },
  { key: "fire", icon: "🔥", color: "from-red-500/20 to-red-600/10", border: "border-red-500/40", glow: "shadow-[0_0_20px_rgba(239,68,68,0.3)]" },
  { key: "medical", icon: "🏥", color: "from-blue-500/20 to-blue-600/10", border: "border-blue-500/40", glow: "shadow-[0_0_20px_rgba(59,130,246,0.3)]" },
  { key: "flood", icon: "🌊", color: "from-cyan-500/20 to-cyan-600/10", border: "border-cyan-500/40", glow: "shadow-[0_0_20px_rgba(34,211,238,0.3)]" },
] as const;

interface IncidentTypeSelectorProps {
  selected: string | null;
  onSelect: (type: string) => void;
}

export function IncidentTypeSelector({ selected, onSelect }: IncidentTypeSelectorProps) {
  const t = useTranslations("citizen.report");

  return (
    <div className="grid grid-cols-2 gap-3">
      {TYPES.map((type) => {
        const isActive = selected === type.key;
        return (
          <motion.button
            key={type.key}
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(type.key)}
            className={clsx(
              "relative flex flex-col items-center gap-2 rounded-xl border p-4 transition-all duration-200",
              "bg-gradient-to-br",
              isActive
                ? `${type.color} ${type.border} ${type.glow}`
                : "border-border bg-base-card hover:border-border-strong"
            )}
          >
            <span className="text-3xl">{type.icon}</span>
            <span className={clsx(
              "text-sm font-medium",
              isActive ? "text-text-primary" : "text-text-secondary"
            )}>
              {t(type.key)}
            </span>
            <span className="text-xs text-text-muted">
              {t(`${type.key}Desc`)}
            </span>
            {isActive && (
              <motion.div
                layoutId="incident-type-check"
                className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-accent-cyan text-xs font-bold text-base"
              >
                ✓
              </motion.div>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
