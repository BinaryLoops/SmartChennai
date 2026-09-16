"use client";

import { useState } from "react";
import { AlertTriangle, Car, ShieldAlert, CheckCircle2 } from "lucide-react";
import type { IncidentPayload } from "@packages/types";

interface Props {
  incidents: IncidentPayload[];
}

export function OperationsPanel({ incidents }: Props) {
  const [loading, setLoading] = useState(false);

  const handleAction = async (endpoint: string, payload: any) => {
    setLoading(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const error = await res.json();
        alert(`Action failed: ${error.error || res.statusText}`);
      } else {
        alert("Action successful! Watch map for changes.");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const activeIncidents = incidents.filter(i => i.status !== "resolved");

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-card p-5 mt-5">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <ShieldAlert className="text-cyan-500" />
        Operations Command Center
      </h3>
      
      {activeIncidents.length === 0 ? (
        <p className="text-slate-400 text-sm">No active incidents requiring intervention.</p>
      ) : (
        <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {activeIncidents.map(inc => (
            <div key={inc.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <span className={`text-xs font-bold uppercase px-2 py-1 rounded ${
                    inc.type === 'traffic' ? 'bg-amber-500/20 text-amber-400' :
                    inc.type === 'flood' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {inc.type}
                  </span>
                  <p className="text-xs text-slate-400 mt-2 font-mono">ID: {inc.id.substring(0,8)}</p>
                </div>
                <span className="text-xs font-mono text-slate-300 bg-slate-800 px-2 py-1 rounded">
                  {inc.status}
                </span>
              </div>
              
              <div className="flex flex-wrap gap-2 mt-4">
                {inc.type === "traffic" && (
                  <button
                    disabled={loading}
                    onClick={() => handleAction("/api/dashboard/traffic/override", {
                      junctionId: inc.id, // For demo, using incident ID as junction or overriding nearest
                      durationMinutes: 5,
                      reason: "Traffic clearance for incident"
                    })}
                    className="text-xs bg-amber-600 hover:bg-amber-500 text-white px-3 py-1.5 rounded transition"
                  >
                    Force Green Override
                  </button>
                )}
                
                {inc.type === "flood" && inc.status === "reported" && (
                  <button
                    disabled={loading}
                    onClick={() => handleAction("/api/dashboard/water/workorder", {
                      incidentId: inc.id,
                      action: "CREATE"
                    })}
                    className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded transition"
                  >
                    Dispatch Team
                  </button>
                )}

                {inc.type === "flood" && inc.status === "in_progress" && (
                  <button
                    disabled={loading}
                    onClick={() => handleAction("/api/dashboard/water/workorder", {
                      incidentId: inc.id,
                      action: "RESOLVE"
                    })}
                    className="text-xs bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded transition flex items-center gap-1"
                  >
                    <CheckCircle2 size={14} /> Resolve Flood
                  </button>
                )}

                {(inc.type === "fire" || inc.type === "medical") && inc.status === "reported" && (
                  <button
                    disabled={loading}
                    onClick={() => handleAction("/api/dashboard/emergency/dispatch", {
                      incidentId: inc.id,
                      action: "DISPATCH"
                    })}
                    className="text-xs bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded transition"
                  >
                    Dispatch Unit
                  </button>
                )}

                {(inc.type === "fire" || inc.type === "medical") && inc.status === "dispatched" && (
                  <button
                    disabled={loading}
                    onClick={() => handleAction("/api/dashboard/emergency/dispatch", {
                      incidentId: inc.id,
                      action: "ARRIVE"
                    })}
                    className="text-xs bg-orange-600 hover:bg-orange-500 text-white px-3 py-1.5 rounded transition"
                  >
                    Unit Arrived
                  </button>
                )}
                
                {(inc.type === "fire" || inc.type === "medical") && inc.status === "arrived" && (
                  <button
                    disabled={loading}
                    onClick={() => handleAction("/api/dashboard/emergency/dispatch", {
                      incidentId: inc.id,
                      action: "START_WORK"
                    })}
                    className="text-xs bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded transition"
                  >
                    Start Work
                  </button>
                )}

                {(inc.type === "fire" || inc.type === "medical") && inc.status === "in_progress" && (
                  <button
                    disabled={loading}
                    onClick={() => handleAction("/api/dashboard/emergency/dispatch", {
                      incidentId: inc.id,
                      action: "RESOLVE"
                    })}
                    className="text-xs bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded transition flex items-center gap-1"
                  >
                    <CheckCircle2 size={14} /> Resolve Incident
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
