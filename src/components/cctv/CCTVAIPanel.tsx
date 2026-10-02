"use client";

import { useTranslations } from "next-intl";
import useSWR from "swr";
import { CCTVAnalysisResult } from "@/lib/ai-cctv/types";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface CCTVAIPanelProps {
  cameraId: string;
}

const fetcher = (url: string) => fetch(url, { method: "POST" }).then((res) => res.json());

export function CCTVAIPanel({ cameraId }: CCTVAIPanelProps) {
  const t = useTranslations("cctv");

  // We use SWR to poll the POST endpoint every 30 seconds
  const { data, error, isLoading, isValidating } = useSWR<{ status: string; message?: string; data?: CCTVAnalysisResult }>(
    `/api/cctv/analysis/${cameraId}`,
    fetcher,
    { refreshInterval: 30000, revalidateOnFocus: false, dedupingInterval: 25000 }
  );

  const [currentTime, setCurrentTime] = useState("");
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString("en-US", { hour12: false }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (error || data?.status === "ERROR" || data?.status === "OFFLINE") {
    return (
      <div className="rounded-xl border border-border bg-[#0D1117] p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-border/50 pb-2">
          <h3 className="text-xs font-bold uppercase tracking-widest text-text-primary flex items-center gap-2">
            <span className="text-accent-cyan">✨</span> AI CCTV ANALYTICS
          </h3>
          <span className="text-[9px] font-bold bg-accent-red/20 text-accent-red px-1.5 py-0.5 rounded border border-accent-red/30">
            OFFLINE
          </span>
        </div>
        <div className="py-4 text-center">
          <p className="text-xs text-text-muted">AI ANALYTICS OFFLINE</p>
          <p className="text-[10px] text-text-muted mt-1 opacity-70">
            {data?.message || "Gemini analysis temporarily unavailable."}
          </p>
        </div>
      </div>
    );
  }

  if (isLoading && !data) {
    return (
      <div className="rounded-xl border border-border bg-[#0D1117] p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-border/50 pb-2">
          <h3 className="text-xs font-bold uppercase tracking-widest text-text-primary flex items-center gap-2">
            <span className="text-accent-cyan">✨</span> AI CCTV ANALYTICS
          </h3>
          <span className="text-[9px] font-bold bg-accent-amber/20 text-accent-amber px-1.5 py-0.5 rounded animate-pulse">
            ANALYZING...
          </span>
        </div>
        <div className="space-y-3 opacity-50">
          <div className="h-3 w-3/4 bg-border/50 rounded animate-pulse" />
          <div className="h-3 w-1/2 bg-border/50 rounded animate-pulse" />
          <div className="h-3 w-2/3 bg-border/50 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (data?.status === "RATE_LIMITED") {
    return (
      <div className="rounded-xl border border-border bg-[#0D1117] p-4 flex flex-col gap-4">
         <div className="flex items-center justify-between border-b border-border/50 pb-2">
          <h3 className="text-xs font-bold uppercase tracking-widest text-text-primary flex items-center gap-2">
            <span className="text-accent-cyan">✨</span> AI CCTV ANALYTICS
          </h3>
          <span className="text-[9px] font-bold bg-accent-amber/20 text-accent-amber px-1.5 py-0.5 rounded border border-accent-amber/30">
            RATE LIMITED
          </span>
        </div>
      </div>
    );
  }

  const analysis = data?.data;
  if (!analysis) return null;

  const analyzedTime = new Date((analysis as any).analyzedAt || Date.now()).toLocaleTimeString("en-US", { hour12: false });

  // Get active incidents safely
  const activeIncidents = Object.entries(analysis.incidents || {})
    .filter(([_, value]) => value === true)
    .map(([key, _]) => {
       const formatted = key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
       return formatted;
    });

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl border border-accent-cyan/30 bg-[#0D1117] p-4 shadow-[0_0_15px_rgba(34,211,238,0.1)] flex flex-col gap-4"
    >
      <div className="flex items-center justify-between border-b border-border/50 pb-2">
        <h3 className="text-xs font-bold uppercase tracking-widest text-text-primary flex items-center gap-2">
          <span className="text-accent-cyan">✨</span> AI CCTV ANALYTICS
        </h3>
        <div className="flex items-center gap-2">
           <span className="text-[8px] bg-black/40 text-text-muted px-1 rounded border border-border">AI OBSERVATION • GEMINI</span>
           <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${isValidating ? 'bg-accent-amber/20 text-accent-amber' : 'bg-accent-green/20 text-accent-green'}`}>
             <span className={`h-1.5 w-1.5 rounded-full ${isValidating ? 'bg-accent-amber animate-pulse' : 'bg-accent-green'}`} />
             {isValidating ? "ANALYZING" : "ACTIVE"}
           </span>
        </div>
      </div>

      <div className="text-[10px] text-text-muted">
         ● ANALYZED {analyzedTime}
      </div>

      <div className="grid grid-cols-2 gap-4 text-xs">
        <div className="space-y-1">
           <div className="flex justify-between"><span className="text-text-muted">Traffic:</span> <span className="font-bold text-text-primary">{analysis.traffic.trafficLevel}</span></div>
           <div className="flex justify-between"><span className="text-text-muted">Vehicles:</span> <span className="font-mono">~{analysis.traffic.vehicleCountEstimate}</span></div>
           <div className="flex justify-between"><span className="text-text-muted">Congestion:</span> <span className="font-mono">~{analysis.traffic.congestionPercentEstimate}%</span></div>
           <div className="flex justify-between"><span className="text-text-muted">Queue:</span> <span className="font-mono">~{analysis.traffic.queueLengthEstimate}</span></div>
           <div className="flex justify-between"><span className="text-text-muted">Pedestrians:</span> <span>{analysis.pedestrians.detected ? `~${analysis.pedestrians.countEstimate}` : "None"}</span></div>
        </div>

        <div className="space-y-2 border-l border-border/50 pl-4">
           <div className="font-bold text-text-muted tracking-widest text-[10px]">INCIDENTS</div>
           {activeIncidents.length > 0 ? (
             activeIncidents.map((inc, idx) => (
                <div key={idx} className="text-accent-red font-semibold text-[10px]">
                  ⚠ {inc}
                </div>
             ))
           ) : (
             <>
               <div className="text-accent-green text-[10px]">✓ No accident</div>
               <div className="text-accent-green text-[10px]">✓ No obstruction</div>
               <div className="text-accent-green text-[10px]">✓ No smoke/fire</div>
             </>
           )}
           <div className="mt-2 pt-2 border-t border-border/50 text-[10px] flex justify-between">
             <span className="text-text-muted">AI Confidence:</span>
             <span className="font-bold">{Math.round(analysis.confidence * 100)}%</span>
           </div>
        </div>
      </div>

      {analysis.observations && analysis.observations.length > 0 && (
        <div className="mt-2 pt-2 border-t border-border/50 space-y-2">
           <div className="font-bold text-text-muted tracking-widest text-[10px]">RECENT AI OBSERVATIONS</div>
           <div className="max-h-[100px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
             {analysis.observations.map((obs, idx) => (
               <div key={idx} className="flex gap-2 items-start bg-base-card/50 p-1.5 rounded text-[10px]">
                  <span className="font-mono text-accent-cyan opacity-70 shrink-0">+{obs.timestampSeconds}s</span>
                  <div>
                    <div className="font-bold text-text-primary">{obs.type}</div>
                    <div className="text-text-muted text-[9px] leading-tight">{obs.description}</div>
                  </div>
               </div>
             ))}
           </div>
        </div>
      )}
    </motion.div>
  );
}

export default CCTVAIPanel;
