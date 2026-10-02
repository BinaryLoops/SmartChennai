"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { CCTV_LOCAL_REGISTRY } from "@/lib/ai-video/registry";

interface CCTVVideoPreviewProps {
  cameraId: string;
  junctionName: string;
  zoneName: string;
  vehiclesPerHour: number;
  congestionLevel: number;
  avgSpeed: number;
  incident?: { type: string; severity: number } | null;
  className?: string;
  onClick?: () => void;
  enabled?: boolean;
}

export function CCTVVideoPreview({
  cameraId,
  junctionName,
  zoneName,
  vehiclesPerHour,
  congestionLevel,
  avgSpeed,
  incident,
  className = "",
  onClick,
  enabled = true,
}: CCTVVideoPreviewProps) {
  const t = useTranslations("cctv");
  
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Intersection observer to pause/play video when scrolled out of view
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const playlist = useMemo(() => {
    let list = CCTV_LOCAL_REGISTRY[cameraId];
    if (!list || list.length === 0) {
      const hash = cameraId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const videoId = (hash % 8) + 1;
      list = [`/cctv/video${videoId}.mp4`];
    }
    return list;
  }, [cameraId]);

  const [videoIndex, setVideoIndex] = useState(0);
  const [videoError, setVideoError] = useState(false);
  const currentVideoUrl = playlist[videoIndex % playlist.length];

  useEffect(() => {
    if (videoRef.current) {
      if (isVisible && enabled && !videoError) {
        // Attempt to play
        videoRef.current.play().catch(e => {
          console.log("Autoplay prevented or interrupted:", e);
        });
      } else {
        videoRef.current.pause();
      }
    }
  }, [isVisible, enabled, currentVideoUrl, videoError]);

  const handleEnded = () => {
    if (playlist.length > 1) {
      setVideoIndex((prev) => prev + 1);
    } else {
      // Loop same video if only 1
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => {});
      }
    }
  };

  const handleVideoError = () => {
    setVideoError(true);
  };

  const [currentTime, setCurrentTime] = useState("");
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString("en-US", { hour12: false }));
    }, 1000);
    // Initial set
    setCurrentTime(new Date().toLocaleTimeString("en-US", { hour12: false }));
    return () => clearInterval(interval);
  }, []);

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

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden rounded-lg bg-[#0D1117] cursor-pointer group ${className}`}
      onClick={onClick}
    >
      {/* Direct inline local video player */}
      <video
        ref={videoRef}
        src={currentVideoUrl}
        onEnded={handleEnded}
        onError={handleVideoError}
        muted
        playsInline
        loop={playlist.length === 1}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
          !videoError ? "opacity-100" : "opacity-0"
        }`}
      />

      {videoError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
          <div className="text-center flex flex-col items-center gap-2">
            <span className="text-2xl text-accent-red">⚠</span>
            <p className="text-xs text-accent-red font-semibold">{t("videoUnavailable", { defaultMessage: "VIDEO UNAVAILABLE" })}</p>
          </div>
        </div>
      )}

      {/* Simulated AI Analytics Overlays */}
      {!videoError && (
        <div className="absolute inset-0 pointer-events-none z-20">
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
                  ⚠ {t("simulatedDetection", { defaultMessage: "Simulated Detection" })}
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
            <div className="text-white text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 bg-accent-cyan/90 shadow-[0_0_8px_rgba(34,211,238,0.6)]">
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
              {t("simulatedCCTV", { defaultMessage: "SIMULATED CCTV" })}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="flex justify-between items-end w-full">
          {/* Analytics Status */}
          <div className="flex flex-col gap-1">
            <div className="bg-accent-cyan/20 border border-accent-cyan/50 text-accent-cyan text-[8px] font-bold px-1.5 py-0.5 rounded w-fit uppercase tracking-widest">
              {t("aiAnalyticsActive", { defaultMessage: "AI ANALYTICS ACTIVE" })}
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
                <p className="text-[7px] text-text-muted leading-tight">
                  {t("simulatedTelemetry", { defaultMessage: "LIVE DEMO • SIMULATED TELEMETRY" })}
                </p>
             </div>
            <div className="bg-black/60 backdrop-blur-sm rounded px-2 py-1">
              <p className="text-[10px] text-text-muted font-mono">{currentTime}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CCTVVideoPreview;
