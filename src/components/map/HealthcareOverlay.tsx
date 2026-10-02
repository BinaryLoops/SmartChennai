import React, { useEffect } from "react";
import { Marker, Popup } from "react-leaflet";
import L from "leaflet";
import useSWR from "swr";
import { Activity, Ambulance } from "lucide-react";
import { renderToStaticMarkup } from "react-dom/server";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const createHospitalIcon = (status: string) => {
  const color = status === "CRITICAL" ? "#ef4444" : status === "OVER_CAPACITY" ? "#f97316" : status === "BUSY" ? "#eab308" : "#10b981";
  
  const iconMarkup = renderToStaticMarkup(
    <div style={{ backgroundColor: color, color: "white", padding: "6px", borderRadius: "50%", border: "2px solid white", boxShadow: "0 2px 4px rgba(0,0,0,0.3)" }}>
      <Activity size={18} />
    </div>
  );

  return L.divIcon({
    html: iconMarkup,
    className: "hospital-icon",
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -17],
  });
};

const createAmbulanceIcon = (status: string) => {
  const color = status === "AVAILABLE" ? "#10b981" : status === "OFFLINE" ? "#6b7280" : "#3b82f6";
  
  const iconMarkup = renderToStaticMarkup(
    <div style={{ backgroundColor: color, color: "white", padding: "4px", borderRadius: "8px", border: "2px solid white", boxShadow: "0 2px 4px rgba(0,0,0,0.3)" }}>
      <Ambulance size={16} />
    </div>
  );

  return L.divIcon({
    html: iconMarkup,
    className: "ambulance-icon",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
};

export default function HealthcareOverlay() {
  const { data, error } = useSWR("/api/healthcare/facilities", fetcher, { refreshInterval: 5000 });

  if (error || !data) return null;

  return (
    <>
      {data.facilities.map((facility: any) => (
        <Marker
          key={facility.id}
          position={[facility.lat, facility.lng]}
          icon={createHospitalIcon(facility.status)}
        >
          <Popup className="custom-popup">
            <div className="p-3 w-64">
              <div className="flex items-center gap-2 border-b border-border pb-2 mb-2">
                <div className={`p-1.5 rounded bg-${facility.status === 'CRITICAL' ? 'red' : 'emerald'}-500/10 text-${facility.status === 'CRITICAL' ? 'red' : 'emerald'}-500`}>
                   <Activity size={16} />
                </div>
                <h3 className="font-bold text-text truncate">{facility.name}</h3>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm mt-3">
                <div className="text-text-muted">Status</div>
                <div className="font-semibold text-right">{facility.status}</div>
                <div className="text-text-muted">ER Wait</div>
                <div className="font-semibold text-right">{facility.waitTimeMinutes} min</div>
                <div className="text-text-muted">ER Load</div>
                <div className="font-semibold text-right">{facility.occupiedEmergencyBeds} / {facility.emergencyBeds}</div>
                <div className="text-text-muted">ICU Load</div>
                <div className="font-semibold text-right">{facility.occupiedIcuBeds} / {facility.icuBeds}</div>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}

      {data.ambulances.map((amb: any) => (
        <Marker
          key={amb.id}
          position={[amb.lat, amb.lng]}
          icon={createAmbulanceIcon(amb.status)}
        >
          <Popup className="custom-popup">
            <div className="p-3 w-48">
              <h3 className="font-bold text-text mb-2 border-b border-border pb-2">Unit {amb.id.substring(0, 8)}</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-muted">Status</span>
                  <span className="font-medium capitalize">{amb.status.replace("_", " ").toLowerCase()}</span>
                </div>
                {amb.eta && (
                  <div className="flex justify-between">
                    <span className="text-text-muted">ETA</span>
                    <span className="font-medium text-orange-400">{amb.eta} min</span>
                  </div>
                )}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
}
