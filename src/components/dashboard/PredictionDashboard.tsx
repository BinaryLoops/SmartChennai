"use client";

import { useTranslations } from "next-intl";
import useSWR from "swr";
import { AlertCircle, TrendingUp, TrendingDown, Minus, Clock, MapPin } from "lucide-react";

const fetcher = (url: string) => fetch(url).then(res => res.json());

const Badge = ({ children, className = "", variant = "default" }: { children: React.ReactNode, className?: string, variant?: string }) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${className}`}>
    {children}
  </span>
);

export default function PredictionDashboard() {
  const t = useTranslations();
  
  const { data: overviewData, error: overviewError } = useSWR("/api/predictions/overview", fetcher, { refreshInterval: 10000 });
  const { data: risksData, error: risksError } = useSWR("/api/predictions/risks", fetcher, { refreshInterval: 10000 });

  if (overviewError || risksError) return <div className="p-8 text-red-500">Failed to load prediction data.</div>;
  if (!overviewData || !risksData || !overviewData.data || !Array.isArray(risksData.data)) return <div className="p-8 text-slate-400">Initializing Predictive Intelligence Engine...</div>;

  const overview = overviewData.data;
  const risks = risksData.data;

  const getRiskColor = (level: string) => {
    switch (level) {
      case "CRITICAL": return "text-red-500 bg-red-500/10 border-red-500/20";
      case "HIGH": return "text-orange-500 bg-orange-500/10 border-orange-500/20";
      case "MODERATE": return "text-yellow-500 bg-yellow-500/10 border-yellow-500/20";
      default: return "text-green-500 bg-green-500/10 border-green-500/20";
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "RISING": return <TrendingUp className="w-4 h-4 text-red-400" />;
      case "FALLING": return <TrendingDown className="w-4 h-4 text-green-400" />;
      default: return <Minus className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            Predictive City Intelligence
            <Badge variant="outline" className="text-xs bg-indigo-500/10 text-indigo-400 border-indigo-500/30">
              LIVE DEMO • SIMULATED TELEMETRY
            </Badge>
          </h1>
          <p className="text-slate-400 mt-1">Cross-sector forecasting and risk analysis powered by Causal Engine</p>
        </div>
      </div>

      {/* KPI ROW */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="text-sm font-medium text-slate-400 mb-1">Active High Risks</div>
          <div className="text-3xl font-bold text-white flex items-center gap-2">
            {risks.length}
            {risks.length > 0 && <AlertCircle className="w-5 h-5 text-red-400" />}
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="text-sm font-medium text-slate-400 mb-1">Forecast Horizon</div>
          <div className="text-3xl font-bold text-white flex items-center gap-2">
            15-60<span className="text-xl text-slate-500 font-normal">min</span>
            <Clock className="w-5 h-5 text-indigo-400" />
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="text-sm font-medium text-slate-400 mb-1">Model Confidence (Avg)</div>
          <div className="text-3xl font-bold text-emerald-400">
            {risks.length > 0 ? Math.round((risks.reduce((acc: number, r: any) => acc + r.confidence, 0) / risks.length) * 100) : 95}%
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="text-sm font-medium text-slate-400 mb-1">Total Predictions</div>
          <div className="text-3xl font-bold text-white">
            {Object.values(overview).reduce((acc: number, val: any) => acc + val.count, 0)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Top Risks Timeline */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-xl font-semibold text-white">Immediate Attention</h2>
          <div className="space-y-3">
            {risks.slice(0, 8).map((risk: any) => (
              <div key={risk.id} className="bg-slate-900 border border-slate-800 rounded-lg p-4 relative overflow-hidden group">
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${risk.riskLevel === 'CRITICAL' ? 'bg-red-500' : 'bg-orange-500'}`} />
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{risk.domain}</span>
                    <Badge variant="outline" className={`text-[10px] uppercase border ${getRiskColor(risk.riskLevel)}`}>
                      {risk.riskLevel}
                    </Badge>
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> in {risk.horizonMinutes}m
                  </div>
                </div>
                <div className="text-sm text-white font-medium mb-1 capitalize">
                  {risk.metric.replace(/([A-Z])/g, ' $1').trim()} at {risk.entityType} {risk.entityId !== 'citywide' ? risk.entityId?.substring(0,6) : 'Citywide'}
                </div>
                <div className="flex items-center justify-between mt-3 text-xs">
                  <div className="flex items-center gap-2 text-slate-300">
                    Forecast: <span className="font-mono bg-slate-800 px-1 py-0.5 rounded">{Math.round(risk.predictedValue * 10)/10}</span>
                    {getTrendIcon(risk.trend)}
                  </div>
                  <div className="text-slate-500">
                    Conf: {Math.round(risk.confidence * 100)}%
                  </div>
                </div>
                {risk.factors && risk.factors.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-800 text-[10px] text-slate-400">
                    Driver: {risk.factors[0].label}
                  </div>
                )}
              </div>
            ))}
            {risks.length === 0 && (
              <div className="text-sm text-slate-500 text-center py-8 bg-slate-900/50 rounded-lg border border-slate-800/50">
                No high-risk predictions active.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Sector Breakdown */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-semibold text-white">Sector Forecasts</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.keys(overview).map(domain => {
              const sector = overview[domain];
              if (!sector || sector.count === 0) return null;
              
              const highestRisk = sector.topRisks[0];
              
              return (
                <div key={domain} className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col h-full">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-white capitalize">{domain}</h3>
                    <div className="text-xs text-slate-500">{sector.count} active</div>
                  </div>
                  
                  {highestRisk ? (
                    <div className="mt-auto space-y-3">
                      <div className="flex justify-between items-end">
                        <div>
                          <div className="text-xs text-slate-400 mb-1">Peak Risk Forecast</div>
                          <Badge variant="outline" className={`border ${getRiskColor(highestRisk.riskLevel)}`}>
                            {highestRisk.riskLevel}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-slate-400 mb-1">in {highestRisk.horizonMinutes}m</div>
                          <div className="font-mono text-lg text-white flex items-center justify-end gap-1">
                            {Math.round(highestRisk.predictedValue)} {getTrendIcon(highestRisk.trend)}
                          </div>
                        </div>
                      </div>
                      
                      {highestRisk.factors && highestRisk.factors.length > 0 && (
                        <div className="bg-slate-950 p-2 rounded text-xs text-slate-400 flex items-start gap-2">
                          <AlertCircle className="w-3 h-3 text-indigo-400 shrink-0 mt-0.5" />
                          <span>{highestRisk.factors[0].label} driving increase</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-auto text-sm text-green-400/70 flex items-center gap-2 bg-green-500/5 p-2 rounded">
                      <TrendingDown className="w-4 h-4" /> Normal conditions expected
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
