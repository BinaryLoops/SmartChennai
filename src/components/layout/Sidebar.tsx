"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import clsx from "clsx";

const items = [
  { key: "overview", href: "/dashboard" },
  { key: "traffic", href: "/dashboard/traffic" },
  { key: "emergency", href: "/dashboard/emergency" },
  { key: "water", href: "/dashboard/water" },
  { key: "citizen", href: "/citizen" },
  { key: "executive", href: "/dashboard/executive" },
  { key: "admin", href: "/dashboard/admin" },
] as const;

export function Sidebar() {
  const t = useTranslations("nav");
  const [collapsed, setCollapsed] = useState(false);

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 220 }}
      transition={{ type: "spring", stiffness: 200, damping: 26 }}
      className="flex h-screen flex-col border-r border-border bg-base-elevated py-4"
    >
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="mb-4 self-end pr-4 text-text-secondary hover:text-text-primary"
        aria-label="Toggle sidebar"
      >
        {collapsed ? "»" : "«"}
      </button>
      <nav className="flex flex-col gap-1 px-3">
        {items.map((item) => (
          <a
            key={item.key}
            href={item.href}
            className={clsx(
              "rounded-lg px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-base-card hover:text-text-primary",
              collapsed && "text-center"
            )}
          >
            {collapsed ? t(item.key).charAt(0) : t(item.key)}
          </a>
        ))}
      </nav>
    </motion.aside>
  );
}
