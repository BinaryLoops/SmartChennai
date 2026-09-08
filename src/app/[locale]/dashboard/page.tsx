import { useTranslations } from "next-intl";
import { KpiCard } from "@/components/ui/KpiCard";

// This page is the Phase 0/2 starting shell. Wire it to Socket.io
// (see worker/simulate.ts) and swap the placeholder grid below for the
// dark Mapbox/Leaflet map + 3D junction markers per the Phase 2 prompt.
export default function OverviewPage() {
  const t = useTranslations("kpi");

  return (
    <div>
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label={t("avgCongestion")} value={62} suffix="%" accent="amber" />
        <KpiCard label={t("activeIncidents")} value={3} accent="red" />
        <KpiCard label={t("floodAlerts")} value={1} accent="amber" />
        <KpiCard label={t("camerasOnline")} value={3940} accent="cyan" />
      </div>

      <div className="flex h-[480px] items-center justify-center rounded-card border border-border bg-base-card text-text-muted">
        Map goes here — Phase 2 (Mapbox dark-v11 + 3D junction pins)
      </div>
    </div>
  );
}
