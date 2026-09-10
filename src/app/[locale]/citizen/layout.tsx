"use client";

import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import clsx from "clsx";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";

const navItems = [
  { key: "home", href: "/citizen", icon: "🏠" },
  { key: "report", href: "/citizen/report", icon: "📝" },
  { key: "track", href: "/citizen/track", icon: "🔍" },
  { key: "alerts", href: "/citizen/alerts", icon: "🔔" },
] as const;

export default function CitizenLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations("citizen.nav");
  const pathname = usePathname();
  const pathWithoutLocale = pathname.replace(/^\/(en|ta|hi)/, "") || "/";

  function isActive(href: string) {
    if (href === "/citizen") {
      return pathWithoutLocale === "/citizen" || pathWithoutLocale === "/citizen/";
    }
    return pathWithoutLocale.startsWith(href);
  }

  return (
    <div className="flex min-h-screen flex-col bg-base">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 border-b border-border bg-base-elevated/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          {/* Brand */}
          <a href="/en/citizen" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent-cyan to-cyan-600 text-sm font-bold text-base">
              SC
            </div>
            <span className="hidden text-sm font-semibold text-text-primary sm:block">
              {t("brand")}
            </span>
          </a>

          {/* Nav links */}
          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const active = isActive(item.href);
              return (
                <a
                  key={item.key}
                  href={item.href}
                  className={clsx(
                    "relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition-colors",
                    active
                      ? "text-accent-cyan"
                      : "text-text-secondary hover:bg-base-card hover:text-text-primary"
                  )}
                >
                  <span className="sm:hidden">{item.icon}</span>
                  <span className="hidden sm:inline">{t(item.key)}</span>
                  {active && (
                    <motion.div
                      layoutId="citizen-nav-indicator"
                      className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-accent-cyan"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                </a>
              );
            })}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <a
              href="/en/dashboard"
              className="hidden text-xs text-text-muted transition-colors hover:text-accent-cyan sm:block"
            >
              {t("backToDashboard")} →
            </a>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {children}
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-base-elevated px-4 py-6 text-center text-xs text-text-muted">
        Smart Chennai ICCC — Citizen Portal • © 2026
      </footer>
    </div>
  );
}
