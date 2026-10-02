import React from "react";
import { Circle, Popup } from "react-leaflet";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface ZoneData {
  id: string;
  name: string;
  boundary?: { type: string; coordinates: number[][][] };
  lat?: number;
  lng?: number;
}

export default function DisasterOverlay({ zones }: { zones: ZoneData[] }) {
  const { data, error } = useSWR("/api/disaster/overview", fetcher, { refreshInterval: 5000 });

  if (error || !data || data.activeScenarios.length === 0) return null;

  return (
    <>
      {data.activeScenarios.map((scenario: any) => {
        // Find the zones affected
        const affectedZones = zones.filter(z => scenario.affectedZones.includes(z.id));
        return affectedZones.map((z, idx) => {
          let clat = z.lat ?? 13.08;
          let clng = z.lng ?? 80.27;
          if (z.boundary && z.boundary.coordinates && z.boundary.coordinates[0] && z.boundary.coordinates[0][0]) {
            clng = z.boundary.coordinates[0][0][0];
            clat = z.boundary.coordinates[0][0][1];
          }

          return (
          <Circle
            key={`${scenario.id}-${z.id}-${idx}`}
            center={[clat, clng]}
            radius={2500} // 2.5km radius
            pathOptions={{
              color: "#ef4444",
              fillColor: "#ef4444",
              fillOpacity: 0.15,
              weight: 2,
              dashArray: "10, 10"
            }}
          >
            <Popup>
              <div className="p-2">
                <h4 className="font-bold text-red-500 mb-1">{scenario.name}</h4>
                <p className="text-sm text-text-muted mb-2">{scenario.description}</p>
                <div className="text-xs">
                  <strong>Impact:</strong> Zone {z.name}
                </div>
              </div>
            </Popup>
          </Circle>
          );
        });
      })}
    </>
  );
}
