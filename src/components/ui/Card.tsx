"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  tilt?: boolean;
}

/**
 * Base dark card surface used everywhere in the app.
 * `tilt` enables a subtle 3D pointer-follow effect — keep this off for
 * dense/data-heavy cards (tables, forms) and reserve it for KPI/landing cards.
 */
export function Card({ children, className, tilt = false }: CardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState("rotateX(0deg) rotateY(0deg)");

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!tilt || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (e.clientY - rect.top - rect.height / 2) / 14;
    const y = (e.clientX - rect.left - rect.width / 2) / -14;
    setTransform(`rotateX(${x}deg) rotateY(${y}deg)`);
  }

  function handleMouseLeave() {
    setTransform("rotateX(0deg) rotateY(0deg)");
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ transform, transformStyle: "preserve-3d" }}
      className={clsx(
        "rounded-card border border-border bg-base-card p-5 transition-transform duration-150 ease-out",
        className
      )}
    >
      {children}
    </motion.div>
  );
}
