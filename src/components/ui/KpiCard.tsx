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

/**
 * KPI number card. Animates the displayed value with a count-up spring
 * whenever `value` changes, and briefly flashes its border in the accent
 * color so live updates are noticeable without being distracting.
 */
export function KpiCard({ label, value, suffix = "", accent = "cyan" }: KpiCardProps) {
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
        "border-2 transition-colors duration-500",
        flash ? accentBorder[accent] : "border-border"
      )}
    >
      <p className="text-sm text-text-secondary">{label}</p>
      <motion.p className={clsx("mt-1 text-2xl font-medium", accentText[accent])}>
        {display}
        {suffix}
      </motion.p>
    </Card>
  );
}
