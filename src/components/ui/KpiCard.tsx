"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import clsx from "clsx";
import { Card } from "./Card";

type Accent = "cyan" | "amber" | "red" | "green";

interface KpiCardProps {
  label: string;
  value: number;
  suffix?: string;
  accent?: Accent;
  trend?: string;
  trendColor?: "red" | "green" | "amber" | "gray";
  subtext?: React.ReactNode;
  lastUpdated?: string;
}

const accentText: Record<Accent, string> = {
  cyan: "text-accent-cyan",
  amber: "text-accent-amber",
  red: "text-accent-red",
  green: "text-accent-green",
};

const accentBorder: Record<Accent, string> = {
  cyan: "border-accent-cyan",
  amber: "border-accent-amber",
  red: "border-accent-red",
  green: "border-accent-green",
};

const trendColors = {
  red: "text-accent-red",
  green: "text-accent-green",
  amber: "text-accent-amber",
  gray: "text-gray-400",
};

/**
 * KPI number card. Animates the displayed value with a count-up spring
 * whenever `value` changes, and briefly flashes its border in the accent
 * color so live updates are noticeable without being distracting.
 */
export function KpiCard({ 
  label, 
  value, 
  suffix = "", 
  accent = "cyan",
  trend,
  trendColor = "gray",
  subtext,
  lastUpdated
}: KpiCardProps) {
  const motionValue = useMotionValue(value);
  const spring = useSpring(motionValue, { stiffness: 120, damping: 20 });
  const [display, setDisplay] = useState(value);
  const [flash, setFlash] = useState(false);
  const prevValue = useRef(value);

  useEffect(() => {
    if (value !== prevValue.current) {
      motionValue.set(value);
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 600);
      prevValue.current = value;
      return () => clearTimeout(t);
    }
  }, [value, motionValue]);

  useEffect(() => {
    const unsubscribe = spring.on("change", (v) => setDisplay(Math.round(v)));
    return unsubscribe;
  }, [spring]);

  return (
    <Card
      className={clsx(
        "border-2 transition-colors duration-500 h-full flex flex-col justify-between",
        flash ? accentBorder[accent] : "border-border"
      )}
    >
      <div>
        <p className="text-sm text-text-secondary font-medium uppercase tracking-wider">{label}</p>
        <div className="flex items-end gap-2 mt-1">
          <motion.p className={clsx("text-3xl font-bold", accentText[accent])}>
            {display}
            {suffix}
          </motion.p>
          {trend && (
            <span className={clsx("text-sm font-medium mb-1", trendColors[trendColor])}>
              {trend}
            </span>
          )}
        </div>
      </div>
      
      {(subtext || lastUpdated) && (
        <div className="mt-4 pt-3 border-t border-border/50 text-xs text-text-muted space-y-1">
          {subtext && <div className="leading-tight">{subtext}</div>}
          {lastUpdated && <div className="leading-tight">Updated: {lastUpdated}</div>}
        </div>
      )}
    </Card>
  );
}
