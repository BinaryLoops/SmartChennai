"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { SkylineHero } from "@/components/three/SkylineHero";
import { useSocket } from "@/hooks/useSocket";

const actionCards = [
  {
    key: "report",
    href: "/citizen/report",
    icon: "📝",
    gradient: "from-cyan-500/20 via-cyan-600/10 to-transparent",
    border: "hover:border-accent-cyan/40",
    glow: "hover:shadow-[0_0_30px_rgba(34,211,238,0.15)]",
  },
  {
    key: "track",
    href: "/citizen/track",
    icon: "🔍",
    gradient: "from-amber-500/20 via-amber-600/10 to-transparent",
    border: "hover:border-amber-500/40",
    glow: "hover:shadow-[0_0_30px_rgba(245,158,11,0.15)]",
  },
  {
    key: "alerts",
    href: "/citizen/alerts",
    icon: "🔔",
    gradient: "from-red-500/20 via-red-600/10 to-transparent",
    border: "hover:border-red-500/40",
    glow: "hover:shadow-[0_0_30px_rgba(239,68,68,0.15)]",
  },
] as const;

export default function CitizenHomePage() {
  const t = useTranslations("citizen.home");
  const { activeIncidents, floodAlerts, waterBySensor } = useSocket();

  const sensorsOnline = waterBySensor.size;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Hero Section */}
      <div className="mb-8 text-center">
        <SkylineHero />
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6 text-3xl font-bold text-text-primary sm:text-4xl"
        >
          {t("title")}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-2 text-xl font-medium text-accent-cyan"
        >
          {t("subtitle")}
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mx-auto mt-3 max-w-xl text-sm text-text-secondary"
        >
          {t("description")}
        </motion.p>
      </div>

      {/* Action Cards */}
      <div className="mb-10 grid gap-4 sm:grid-cols-3">
        {actionCards.map((card, i) => (
          <motion.a
            key={card.key}
            href={card.href}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + i * 0.1 }}
            whileHover={{ y: -4 }}
            className={`group relative overflow-hidden rounded-2xl border border-border bg-base-card p-6 transition-all duration-300 ${card.border} ${card.glow}`}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-0 transition-opacity duration-300 group-hover:opacity-100`} />
            <div className="relative">
              <span className="text-4xl">{card.icon}</span>
              <h3 className="mt-4 text-lg font-semibold text-text-primary">
                {t(`${card.key}Card`)}
              </h3>
              <p className="mt-2 text-sm text-text-secondary">
                {t(`${card.key}Desc`)}
              </p>
              <div className="mt-4 flex items-center gap-1 text-sm font-medium text-accent-cyan opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                <span>→</span>
              </div>
            </div>
          </motion.a>
        ))}
      </div>

      {/* Live Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="mb-10 grid grid-cols-3 gap-4"
      >
        <div className="rounded-xl border border-border bg-base-card p-4 text-center">
          <p className="text-2xl font-bold text-accent-amber">{activeIncidents}</p>
          <p className="mt-1 text-xs text-text-muted">{t("activeIncidents")}</p>
        </div>
        <div className="rounded-xl border border-border bg-base-card p-4 text-center">
          <p className="text-2xl font-bold text-accent-red">{floodAlerts}</p>
          <p className="mt-1 text-xs text-text-muted">{t("floodAlerts")}</p>
        </div>
        <div className="rounded-xl border border-border bg-base-card p-4 text-center">
          <p className="text-2xl font-bold text-accent-green">{sensorsOnline}</p>
          <p className="mt-1 text-xs text-text-muted">{t("sensorsOnline")}</p>
        </div>
      </motion.div>

      {/* Emergency Contacts */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        className="rounded-2xl border border-border bg-base-card p-6"
      >
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-text-muted">
          {t("emergencyContacts")}
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <a href="tel:100" className="flex flex-col items-center gap-2 rounded-xl bg-base-elevated p-4 transition-colors hover:bg-base">
            <span className="text-2xl">🚔</span>
            <span className="text-xs text-text-secondary">{t("police")}</span>
            <span className="text-lg font-bold text-accent-cyan">100</span>
          </a>
          <a href="tel:101" className="flex flex-col items-center gap-2 rounded-xl bg-base-elevated p-4 transition-colors hover:bg-base">
            <span className="text-2xl">🚒</span>
            <span className="text-xs text-text-secondary">{t("fire")}</span>
            <span className="text-lg font-bold text-accent-red">101</span>
          </a>
          <a href="tel:108" className="flex flex-col items-center gap-2 rounded-xl bg-base-elevated p-4 transition-colors hover:bg-base">
            <span className="text-2xl">🚑</span>
            <span className="text-xs text-text-secondary">{t("ambulance")}</span>
            <span className="text-lg font-bold text-accent-green">108</span>
          </a>
        </div>
      </motion.div>
    </div>
  );
}
