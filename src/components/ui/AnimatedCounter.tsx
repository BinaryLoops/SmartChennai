"use client";

import { useEffect, useState } from "react";
import { useInView } from "framer-motion";
import { useRef } from "react";

export function AnimatedCounter({ value, suffix = "", duration = 2 }: { value: number, suffix?: string, duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (inView) {
      let startTimestamp: number | null = null;
      const step = (timestamp: number) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / (duration * 1000), 1);
        
        // Ease out quad
        const easeProgress = progress * (2 - progress);
        setCount(value * easeProgress);

        if (progress < 1) {
          window.requestAnimationFrame(step);
        }
      };
      window.requestAnimationFrame(step);
    }
  }, [inView, value, duration]);

  // Format the number to keep 1 decimal if it's a float, else 0
  const isFloat = value % 1 !== 0;
  const displayValue = isFloat ? count.toFixed(1) : Math.round(count).toString();

  return <span ref={ref}>{displayValue}{suffix}</span>;
}
