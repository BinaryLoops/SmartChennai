"use client";

import { useEffect, useState } from "react";
import { Polygon, Tooltip, useMap } from "react-leaflet";
import useSWR from "swr";
import L from "leaflet";

const fetcher = (url: string) => fetch(url).then(res => res.json());
import { ZoneData } from "./ChennaiMap";

interface PredictiveRiskOverlayProps {
  zones: ZoneData[];
}

export function PredictiveRiskOverlay({ zones }: PredictiveRiskOverlayProps) {
  const { data: risksData } = useSWR("/api/predictions/risks", fetcher, { refreshInterval: 10000 });
  const map = useMap();

  if (!risksData || !Array.isArray(risksData.data)) return null;

  const risks = risksData.data;

  // Group risks by zoneId
  const zoneRisks = new Map<string, any[]>();
  for (const risk of risks) {
    if (risk.entityType === 'zone' && risk.entityId) {
      if (!zoneRisks.has(risk.entityId)) zoneRisks.set(risk.entityId, []);
      zoneRisks.get(risk.entityId)!.push(risk);
    }
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case "CRITICAL": return "#ef4444"; // red-500
      case "HIGH": return "#f97316"; // orange-500
      case "MODERATE": return "#eab308"; // yellow-500
      default: return "#22c55e"; // green-500
    }
  };

  return (
    <>
      {zones.map((zone) => {
        const activeRisks = zoneRisks.get(zone.id);
        if (!activeRisks || activeRisks.length === 0) return null;

        // Find highest risk
        const highestRisk = activeRisks.reduce((prev, curr) => {
          const score = { 'CRITICAL': 4, 'HIGH': 3, 'MODERATE': 2, 'LOW': 1 };
          return score[curr.riskLevel as keyof typeof score] > score[prev.riskLevel as keyof typeof score] ? curr : prev;
        });

        // Convert coordinates for Leaflet ([lat, lng])
        const positions = zone.boundary.coordinates[0].map(
          (coord: number[]) => [coord[1], coord[0]] as [number, number]
        );

        return (
          <Polygon
            key={zone.id}
            positions={positions}
            pathOptions={{
              color: getRiskColor(highestRisk.riskLevel),
              fillColor: getRiskColor(highestRisk.riskLevel),
              fillOpacity: 0.3,
              weight: 2,
              dashArray: "5, 5" // Dashed to indicate it's predictive, not actual boundary
            }}
          >
            <Tooltip sticky>
              <div className="p-1">
                <div className="font-bold text-sm border-b pb-1 mb-1">{zone.name} Predictive Risk</div>
                {activeRisks.map((risk, i) => (
                  <div key={i} className="text-xs mb-1">
                    <span className="font-semibold capitalize text-indigo-400">{risk.domain}</span>: {risk.metric} 
                    <span className={`ml-1 font-bold ${
                      risk.riskLevel === 'CRITICAL' ? 'text-red-500' :
                      risk.riskLevel === 'HIGH' ? 'text-orange-500' : 'text-yellow-500'
                    }`}>
                      {risk.riskLevel}
                    </span> in {risk.horizonMinutes}m
                  </div>
                ))}
              </div>
            </Tooltip>
          </Polygon>
        );
      })}
    </>
  );
}
