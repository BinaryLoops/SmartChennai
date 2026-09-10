"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { useAIVideoQueue } from "@/hooks/useAIVideoQueue";

interface ContinuousAIPlayerProps {
  cameraId: string;
  junctionName: string;
  zoneName: string;
  vehiclesPerHour: number;
  congestionLevel: number;
  avgSpeed: number;
  incident?: { type: string; severity: number } | null;
  timestamp?: string;
  className?: string;
  onClick?: () => void;
  enabled?: boolean;
}

export function ContinuousAIPlayer({
  cameraId,
  junctionName,
  zoneName,
  vehiclesPerHour,
  congestionLevel,
  avgSpeed,
  incident,
  timestamp,
  className = "",
  onClick,
  enabled = true,
}: ContinuousAIPlayerProps) {
  const t = useTranslations("cctv");
  
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection observer to only generate when visible
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.1 }
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const { playingUrl, readyCount, isGenerating, error, playNext } = useAIVideoQueue({
    cameraId,
    locationName: junctionName,
    isVisible: isVisible && enabled,
    context: {
      congestion: congestionLevel,
      vehiclesPerHour,
      incidentType: incident?.type,
      incidentSeverity: incident?.severity,
    },
  });

  const videoARef = useRef<HTMLVideoElement>(null);
  const videoBRef = useRef<HTMLVideoElement>(null);
  const [activePlayer, setActivePlayer] = useState<"A" | "B">("A");
  
  // Track previous url to load into the hidden player for crossfading
  const [urlA, setUrlA] = useState<string | null>(null);
  const [urlB, setUrlB] = useState<string | null>(null);

  useEffect(() => {
    if (!playingUrl) return;

    if (activePlayer === "A") {
      if (urlA !== playingUrl) {
        setUrlA(playingUrl);
        videoARef.current?.load();
        videoARef.current?.play().catch(e => console.log("Play interrupted", e));
      }
    } else {
      if (urlB !== playingUrl) {
        setUrlB(playingUrl);
        videoBRef.current?.load();
        videoBRef.current?.play().catch(e => console.log("Play interrupted", e));
      }
    }
  }, [playingUrl, activePlayer, urlA, urlB]);

  const handleEnded = () => {
    // Switch active player
    setActivePlayer((prev) => (prev === "A" ? "B" : "A"));
    playNext();
  };

  const [currentTime, setCurrentTime] = useState("");
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString("en-US", { hour12: false }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const timeStr = timestamp || currentTime;

  if (!enabled) {
    return (
      <div className={`relative overflow-hidden rounded-lg bg-[#0D1117] flex items-center justify-center cursor-pointer ${className}`} onClick={onClick}>
        <div className="text-center">
          <span className="text-3xl opacity-40">📷</span>
          <p className="mt-1 text-xs text-text-muted">{t("cameraOffline")}</p>
        </div>
      </div>
    );
  }

  const isConfigError = error === "AI VIDEO PROVIDER NOT CONFIGURED";

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden rounded-lg bg-[#0D1117] cursor-pointer group ${className}`}
      onClick={onClick}
    >
      {/* Dual Video Players for seamless ping-pong transitions */}
      <video
        ref={videoARef}
        src={urlA || undefined}
        onEnded={handleEnded}
        muted
        playsInline
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
          activePlayer === "A" && playingUrl ? "opacity-100" : "opacity-0"
        }`}
      />
      <video
        ref={videoBRef}
        src={urlB || undefined}
        onEnded={handleEnded}
        muted
        playsInline
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
          activePlayer === "B" && playingUrl ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* States: Buffer Empty / Error */}
      {(!playingUrl || isConfigError) && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
          <div className="text-center flex flex-col items-center gap-2">
            {isConfigError ? (
              <>
                <span className="text-2xl text-accent-red">⚠</span>
                <p className="text-xs text-accent-red font-semibold">{t("aiProviderNotConfigured", { defaultMessage: "AI VIDEO PROVIDER NOT CONFIGURED" })}</p>
                <p className="text-[10px] text-text-muted">Configure AI_VIDEO_API_KEY to generate video.</p>
              </>
            ) : error ? (
              <>
                <span className="text-2xl text-accent-red">⚠</span>
                <p className="text-xs text-accent-red font-semibold">{t("aiGenerationOffline", { defaultMessage: "AI VIDEO GENERATION OFFLINE" })}</p>
              </>
            ) : (
              <>
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent-cyan border-t-transparent" />
                <p className="text-xs text-text-muted">{t("aiGenerationDelay", { defaultMessage: "AI GENERATION DELAY" })}</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Simulated AI Analytics Overlays (drawn over the video) */}
      {playingUrl && (
        <div className="absolute inset-0 pointer-events-none z-20">
          {/* Example simulated bounding box floating on screen */}
          <motion.div
            className="absolute border border-accent-cyan bg-accent-cyan/10 rounded-sm"
            initial={{ top: "40%", left: "40%", width: 40, height: 40, opacity: 0 }}
            animate={{ top: "60%", left: "45%", width: 60, height: 60, opacity: 1 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          >
            <span className="absolute -top-4 left-0 bg-accent-cyan text-base-card text-[8px] px-1 font-bold">
              CAR {Math.round(avgSpeed)}km/h
            </span>
          </motion.div>

          {incident && (
             <div className="absolute top-[30%] left-[20%] right-[20%] bottom-[30%] border-2 border-dashed border-red-500 bg-red-500/10 flex items-center justify-center">
                <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 uppercase tracking-wider shadow-lg">
                  ⚠ {t("simulatedDetection")}
                </span>
             </div>
          )}
        </div>
      )}

      {/* CCTV HUD Overlay */}
      <div className="absolute inset-0 z-30 pointer-events-none flex flex-col justify-between p-2">
        {/* Top Bar */}
        <div className="flex justify-between items-start w-full">
          {/* Camera Info */}
          <div className="bg-black/60 backdrop-blur-sm rounded px-2 py-1">
            <p className="text-[10px] text-text-primary font-bold font-mono">CAM {cameraId.slice(0, 8).toUpperCase()}</p>
            <p className="text-[9px] text-text-muted leading-tight">{junctionName}</p>
            <p className="text-[9px] text-text-muted leading-tight">Zone {zoneName}</p>
          </div>
          
          {/* Status Indicator */}
          <div className="flex flex-col items-end gap-1">
            <div className="bg-accent-red/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 shadow-[0_0_8px_rgba(239,68,68,0.6)]">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
              {t("liveAiGenerated", { defaultMessage: "LIVE • AI GENERATED" })}
            </div>
            {/* Status debug pill */}
            <div className="flex items-center gap-1">
               {isGenerating && <span className="text-[8px] bg-accent-amber/80 text-white px-1 rounded">{t("generatingNext", { defaultMessage: "GENERATING" })}</span>}
               {readyCount > 0 && <span className="text-[8px] bg-accent-cyan/80 text-white px-1 rounded">{readyCount} BUF</span>}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="flex justify-between items-end w-full">
          {/* Analytics Status */}
          <div className="flex flex-col gap-1">
            <div className="bg-accent-cyan/20 border border-accent-cyan/50 text-accent-cyan text-[8px] font-bold px-1.5 py-0.5 rounded w-fit uppercase tracking-widest">
              {t("aiAnalyticsActive")}
            </div>
            <div className="bg-black/60 backdrop-blur-sm rounded px-2 py-1 w-fit">
              <p className="text-[9px] text-text-primary"><span className="text-text-muted">{t("vph")}:</span> <span className="font-mono">{vehiclesPerHour}</span></p>
              <p className="text-[9px] text-text-primary"><span className="text-text-muted">{t("speed")}:</span> <span className="font-mono">{Math.round(avgSpeed)}km/h</span></p>
              <p className="text-[9px] text-text-primary"><span className="text-text-muted">{t("congestion")}:</span> <span className="font-mono">{Math.round(congestionLevel * 100)}%</span></p>
            </div>
          </div>
          
          {/* Disclosure & Time */}
          <div className="flex flex-col items-end gap-1 text-right">
             <div className="bg-black/40 backdrop-blur-sm rounded px-1.5 py-0.5 max-w-[120px]">
                <p className="text-[7px] text-text-muted leading-tight">{t("aiDisclosure", { defaultMessage: "AI-GENERATED CCTV SIMULATION FOR DEMONSTRATION PURPOSES" })}</p>
             </div>
            <div className="bg-black/60 backdrop-blur-sm rounded px-2 py-1">
              <p className="text-[10px] text-text-muted font-mono">{timeStr}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ContinuousAIPlayer;
