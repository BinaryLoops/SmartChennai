"use client";

import { useSocket } from "@/hooks/useSocket";
import { Activity, Droplets, Leaf, Zap, Trash2 } from "lucide-react";

export function CityHealthWidget() {
  const { cityHealth, trafficByJunction, waterBySensor, cityEvents } = useSocket();

  if (!cityHealth) {
    return (
      <div className="bg-white dark:bg-[#1a1b1e] rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-800 flex items-center justify-between animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-800"></div>
          <div>
            <div className="h-4 w-24 bg-gray-200 dark:bg-gray-800 rounded mb-2"></div>
            <div className="h-6 w-16 bg-gray-200 dark:bg-gray-800 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-500";
    if (score >= 60) return "text-amber-500";
    return "text-red-500";
  };

  const components = [
    { name: "Traffic", score: cityHealth.components.traffic, icon: Activity },
    { name: "Water", score: cityHealth.components.water, icon: Droplets },
    { name: "Environment", score: cityHealth.components.environment, icon: Leaf },
    { name: "Energy", score: cityHealth.components.energy, icon: Zap },
    { name: "Waste", score: cityHealth.components.waste, icon: Trash2 },
  ];

  // Dynamically compute contributing factors from state
  const getContributingFactors = () => {
    const factors = [];
    const congestedJunctions = Array.from(trafficByJunction.values()).filter(r => r.congestionLevel > 0.8).length;
    if (congestedJunctions > 0) {
      factors.push(`${congestedJunctions} junctions above 80% congestion`);
    }

    const floodAlerts = Array.from(waterBySensor.values()).filter(w => w.riskLevel === "danger" || w.riskLevel === "warning").length;
    if (floodAlerts > 0) {
      factors.push(`${floodAlerts} active flood alerts/warnings`);
    }

    const criticalEvents = cityEvents.filter(e => e.severity === "CRITICAL" || e.severity === "HIGH").length;
    if (criticalEvents > 0) {
      factors.push(`${criticalEvents} critical city events`);
    }

    if (factors.length === 0) {
      factors.push("City systems operating normally");
    }

    return factors;
  };

  const factors = getContributingFactors();

  return (
    <div className="bg-white dark:bg-[#1a1b1e] rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            City Health Index
          </h3>
          <div className="flex items-baseline gap-2 mt-1">
            <span className={`text-3xl font-bold ${getScoreColor(cityHealth.overallScore)}`}>
              {cityHealth.overallScore}
            </span>
            <span className="text-sm text-gray-400">/ 100</span>
          </div>
        </div>
        
        <div className="relative w-12 h-12 rounded-full border-4 border-gray-100 dark:border-gray-800 flex items-center justify-center">
          <svg className="absolute top-0 left-0 w-full h-full transform -rotate-90">
            <circle
              cx="20"
              cy="20"
              r="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              className={getScoreColor(cityHealth.overallScore)}
              strokeDasharray={`${(cityHealth.overallScore / 100) * 125} 125`}
            />
          </svg>
          <Activity className={`w-5 h-5 ${getScoreColor(cityHealth.overallScore)}`} />
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 pb-3 border-y border-gray-100 dark:border-gray-800">
        {components.map((comp) => (
          <div key={comp.name} className="flex flex-col items-center gap-1" title={`${comp.name}: ${comp.score}`}>
            <div className={`p-1.5 rounded-md ${
              comp.score >= 80 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' :
              comp.score >= 60 ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' :
              'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400'
            }`}>
              <comp.icon className="w-4 h-4" />
            </div>
            <div className="w-8 h-1 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
              <div 
                className={`h-full rounded-full ${
                  comp.score >= 80 ? 'bg-emerald-500' :
                  comp.score >= 60 ? 'bg-amber-500' :
                  'bg-red-500'
                }`} 
                style={{ width: `${comp.score}%` }} 
              />
            </div>
          </div>
        ))}
      </div>

      <div className="pt-3 flex-1">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Contributing Factors</h4>
        <ul className="space-y-1.5">
          {factors.map((factor, i) => (
            <li key={i} className="text-sm text-gray-600 dark:text-gray-300 flex items-start gap-2">
              <span className="text-gray-400 mt-0.5">•</span>
              <span className="line-clamp-2">{factor}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
