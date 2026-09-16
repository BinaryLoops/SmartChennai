import { getTranslations } from "next-intl/server";
import { ScenarioControlPanel } from "@/components/simulation/ScenarioControlPanel";
import { CausalChainVisualizer } from "@/components/simulation/CausalChainVisualizer";
import { CityStateSummary } from "@/components/simulation/CityStateSummary";
import { CityHealthWidget } from "@/components/dashboard/CityHealthWidget";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Simulation Command Center | Smart Chennai",
  description: "Cross-Sector Causal Simulation Engine for Smart Chennai ICCC",
};

export default async function SimulationPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const t = await getTranslations({ locale, namespace: "Dashboard" });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            Simulation Command Center
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Causal scenario modeling and cross-sector impact analysis.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)] min-h-[600px]">
        {/* Left Column: Controls & Health */}
        <div className="lg:col-span-1 space-y-6 flex flex-col">
          <div className="flex-none">
            <ScenarioControlPanel />
          </div>
          <div className="flex-none">
            <CityHealthWidget />
          </div>
        </div>

        {/* Middle Column: Causal Chain Visualizer */}
        <div className="lg:col-span-1">
          <CausalChainVisualizer />
        </div>

        {/* Right Column: Live City State & Timeline */}
        <div className="lg:col-span-1">
          <CityStateSummary />
        </div>
      </div>
    </div>
  );
}
