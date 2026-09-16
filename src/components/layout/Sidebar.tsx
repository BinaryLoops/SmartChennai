"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import clsx from "clsx";

const items = [
  { key: "overview", href: "/dashboard" },
  { key: "traffic", href: "/dashboard/traffic" },
  { key: "emergency", href: "/dashboard/emergency" },
  { key: "water", href: "/dashboard/water" },
  { key: "queueHealth", href: "/admin/queue-health" },
  { key: "citizen", href: "/citizen" },
  { key: "executive", href: "/dashboard/executive" },
  { key: "admin", href: "/dashboard/admin" },
] as const;

export function Sidebar({ role }: { role: string }) {
  const t = useTranslations("nav");
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const navItems = [
    { key: "overview", href: "/dashboard", roles: ["citizen", "operator", "dept_head", "dm", "commissioner", "super_admin"] },
    { key: "traffic", href: "/dashboard/traffic", roles: ["citizen", "operator", "dept_head", "dm", "commissioner", "super_admin"] },
    { key: "emergency", href: "/dashboard/emergency", roles: ["citizen", "operator", "dept_head", "dm", "commissioner", "super_admin"] },
    { key: "water", href: "/dashboard/water", roles: ["citizen", "operator", "dept_head", "dm", "commissioner", "super_admin"] },
    { key: "environment", href: "/dashboard/environment", roles: ["citizen", "operator", "dept_head", "dm", "commissioner", "super_admin"] },
    { key: "waste", href: "/dashboard/waste", roles: ["citizen", "operator", "dept_head", "dm", "commissioner", "super_admin"] },
    { key: "energy", href: "/dashboard/energy", roles: ["citizen", "operator", "dept_head", "dm", "commissioner", "super_admin"] },
    { key: "assets", href: "/dashboard/assets", roles: ["traffic_operator", "emergency_operator", "water_operator", "executive", "super_admin", "operator", "dept_head", "dm", "commissioner"] },
    { key: "simulation", href: "/dashboard/simulation", roles: ["executive", "super_admin", "dm", "commissioner"] },
    { key: "queueHealth", href: "/admin/queue-health", roles: ["admin", "super_admin"] },
    { key: "citizen", href: "/citizen", roles: ["citizen", "operator", "dept_head", "dm", "commissioner", "super_admin"] },
    { key: "executive", href: "/dashboard/executive", roles: ["dm", "commissioner", "super_admin"] },
    { key: "admin", href: "/dashboard/admin", roles: ["super_admin"] },
  ].filter((item) => item.roles.includes(role));

  // Extract the path without the locale prefix (e.g., /en/dashboard → /dashboard)
  const pathWithoutLocale = pathname.replace(/^\/(en|ta|hi)/, "") || "/";

  function isActive(href: string) {
    // Exact match for overview, prefix match for sub-routes
    if (href === "/dashboard") {
      return pathWithoutLocale === "/dashboard" || pathWithoutLocale === "/dashboard/";
    }
    return pathWithoutLocale.startsWith(href);
  }

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 220 }}
      transition={{ type: "spring", stiffness: 200, damping: 26 }}
      className="flex h-screen flex-col border-r border-border bg-base-elevated py-4 print:hidden"
    >
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="mb-4 self-end pr-4 text-text-secondary hover:text-text-primary"
        aria-label="Toggle sidebar"
      >
        {collapsed ? "»" : "«"}
      </button>
      <nav className="flex flex-col gap-1 px-3">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <a
              key={item.key}
              href={item.href}
              className={clsx(
                "relative rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-accent-cyan/10 font-medium text-accent-cyan"
                  : "text-text-secondary hover:bg-base-card hover:text-text-primary",
                collapsed && "text-center"
              )}
            >
              {/* Active indicator bar */}
              {active && !collapsed && (
                <motion.span
                  layoutId="sidebar-active-indicator"
                  className="absolute left-0 top-1 h-[calc(100%-8px)] w-[3px] rounded-r-full bg-accent-cyan"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              {collapsed ? t(item.key).charAt(0) : t(item.key)}
            </a>
          );
        })}
      </nav>
    </motion.aside>
  );
}
