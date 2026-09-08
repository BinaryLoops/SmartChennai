import { useTranslations } from "next-intl";
import { SkylineHero } from "@/components/three/SkylineHero";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { KpiCard } from "@/components/ui/KpiCard";

export default function LandingPage() {
  const t = useTranslations("landing");

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col items-center px-6 py-10 text-center">
      <div className="mb-8 self-end">
        <LanguageSwitcher />
      </div>

      <SkylineHero />

      <h1 className="mt-6 text-3xl font-medium text-text-primary">{t("title")}</h1>
      <p className="mt-3 max-w-xl text-text-secondary">{t("subtitle")}</p>

      <a
        href="/en/dashboard"
        className="mt-8 rounded-lg border border-accent-cyan px-6 py-2.5 text-sm font-medium text-accent-cyan shadow-glow transition hover:bg-accent-cyan hover:text-base"
      >
        {t("cta")}
      </a>

      <div className="mt-12 grid w-full grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label={t("statCongestion")} value={35} suffix="%" accent="green" />
        <KpiCard label={t("statResponse")} value={50} suffix="%" accent="cyan" />
        <KpiCard label={t("statCitizens")} value={8.7} suffix="M" accent="amber" />
        <KpiCard label={t("statZones")} value={15} accent="cyan" />
      </div>
    </main>
  );
}
