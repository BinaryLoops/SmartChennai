"use client";

import { Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";

import { useEffect, useState } from "react";

// Map markers
const garbageBinIcon = new L.Icon({
  iconUrl: "https://unpkg.com/lucide-static@0.321.0/icons/trash-2.svg",
  iconSize: [24, 24],
  className: "map-icon map-icon-waste",
});

const vehicleIcon = new L.Icon({
  iconUrl: "https://unpkg.com/lucide-static@0.321.0/icons/truck.svg",
  iconSize: [32, 32],
  className: "map-icon map-icon-waste-vehicle",
});

export function WasteMarkers() {
  const [overviewData, setOverviewData] = useState<any>(null);

  useEffect(() => {
    const fetchWaste = async () => {
      try {
        const res = await fetch("/api/waste/overview");
        const data = await res.json();
        setOverviewData(data);
      } catch (err) {}
    };
    fetchWaste();
    const interval = setInterval(fetchWaste, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!overviewData || !overviewData.bins) return null;

  return (
    <>
      {/* Bins */}
      {overviewData.bins.map((bin: any) => (
        <Marker
          key={bin.id}
          position={[bin.lat, bin.lng]}
          icon={garbageBinIcon}
        >
          <Popup className="custom-popup">
            <div className="p-1">
              <div className="text-xs text-text-muted mb-1">{bin.zoneName}</div>
              <div className="font-semibold text-text mb-2">Garbage Bin {bin.id.slice(0, 6)}</div>
              
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <span className="text-text-muted">Fill Level</span>
                <span className={bin.fillPercentage >= 95 ? "text-red-500 font-bold" : bin.fillPercentage >= 80 ? "text-yellow-500" : "text-emerald-500"}>
                  {bin.fillPercentage}%
                </span>

                <span className="text-text-muted">Status</span>
                <span className="text-text">{bin.status}</span>

                <span className="text-text-muted">Priority</span>
                <span className="text-text">{bin.priorityScore}</span>

                {bin.predictedOverflow && (
                  <>
                    <span className="text-text-muted">Overflow ETA</span>
                    <span className="text-red-400">{new Date(bin.predictedOverflow).toLocaleTimeString()}</span>
                  </>
                )}

                {bin.assignedVehicle && (
                  <>
                    <span className="text-text-muted">Assigned To</span>
                    <span className="text-blue-400">{bin.assignedVehicle}</span>
                  </>
                )}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Vehicles & Routes */}
      {overviewData.activeRoutes?.map((route: any) => (
        <div key={route.id}>
          <Marker position={[route.lat, route.lng]} icon={vehicleIcon}>
             <Popup className="custom-popup">
                <div className="p-1">
                   <div className="font-semibold text-text mb-1">Vehicle {route.vehicleCode}</div>
                   <div className="text-sm text-text-muted">Status: {route.status}</div>
                </div>
             </Popup>
          </Marker>
          <Polyline 
            positions={[
              [route.lat, route.lng],
              ...route.stops.map((s: any) => [s.lat, s.lng])
            ]} 
            pathOptions={{ color: '#3b82f6', weight: 3, dashArray: '5, 5' }} 
          />
        </div>
      ))}
    </>
  );
}
