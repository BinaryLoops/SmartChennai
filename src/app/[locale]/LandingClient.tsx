"use client";

import { useTranslations } from "next-intl";
import { CinematicCityFlythrough } from "@/components/map/CinematicCityFlythrough";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import { useState, useCallback } from "react";
import { X, Activity } from "lucide-react";
import Link from "next/link";

export default function LandingClient({ locale }: { locale: string }) {
  const t = useTranslations("landing");

  const [cinemaMode, setCinemaMode] = useState(false);
  const [currentSector, setCurrentSector] = useState(t("kathipara") || "KATHIPARA");

  const onLocationChange = useCallback((name: string) => {
    setCurrentSector(t(name.toLowerCase() === 't. nagar' ? 'tNagar' : name.toLowerCase().replace(" ", "")) || name);
  }, [t]);

  const hideCls = cinemaMode ? "pointer-events-none opacity-0 transition-opacity duration-700" : "transition-opacity duration-700 opacity-100";

  return (
    <main className="relative flex min-h-[100dvh] w-full flex-col overflow-x-hidden font-sans select-none">
      <div className="fixed inset-0 z-0 h-[100dvh] w-full">
        <CinematicCityFlythrough 
          cinemaMode={cinemaMode} 
          onLocationChange={onLocationChange} 
        />
      </div>

      
      <div className="pointer-events-none fixed inset-0 z-10 h-[100dvh] w-full bg-gradient-to-b from-slate-950/90 via-transparent to-slate-950/90" />

      {cinemaMode && (
        <div className="absolute inset-0 z-40 pointer-events-none p-5 lg:p-8 flex flex-col justify-between">
          <div className="flex justify-between items-start pointer-events-auto">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 border border-cyan-900/50 bg-cyan-950/40 px-3 py-1.5 text-[10px] font-semibold tracking-[0.18em] backdrop-blur-md">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan-500"></span>
                </span>
                <span className="text-white">{t("liveCityDigitalTwin")}</span>
                <span className="h-3 w-px bg-slate-700" />
                <span className="text-cyan-400 font-mono">{currentSector}</span>
              </div>
            </div>
            
            <button onClick={() => setCinemaMode(false)} className="flex items-center gap-2 border border-slate-700 bg-slate-900/70 px-3 py-2 text-[10px] tracking-[0.18em] text-slate-400 backdrop-blur-md hover:text-white transition-colors cursor-pointer">
              <X size={13} /> {t("exitOverview")}
            </button>
          </div>
        </div>
      )}

      <div className={`relative z-20 flex flex-col h-full w-full ${hideCls}`}>
        <header className="relative z-20 flex w-full max-w-7xl mx-auto items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-500/50 bg-cyan-950/40 text-cyan-400 shadow-glow">
            🏛️
          </div>
          <div className="flex flex-col">
            <div className="text-base font-extrabold tracking-wider text-white uppercase flex items-center gap-2">
              ICCC <span className="font-light text-cyan-400">SMART CHENNAI</span>
            </div>
            <span className="text-[10px] tracking-widest text-slate-400 uppercase">
              Integrated Command & Control Centre
            </span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-4 text-xs font-medium text-slate-300 tracking-wide">
          <span>{t("tagline")}</span>
        </div>

        <div className="flex items-center gap-4">
          <LanguageSwitcher />
        </div>
      </header>

      {/* 4. Hero Content & Floating ICCC HUD Panels */}
      <div className="relative z-20 flex flex-1 flex-col justify-between px-6 pt-2 pb-8 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center my-auto w-full">
          
          {/* Left HUD Panel — City Key Metrics */}
          <div className="hidden lg:flex lg:col-span-3 flex-col gap-4 p-5 rounded-2xl border border-cyan-500/30 bg-slate-950/40 backdrop-blur-md shadow-2xl text-left">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-bold tracking-wider text-cyan-400 uppercase flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                CITY TELEMETRY
              </span>
              <span className="text-[10px] text-slate-400 font-mono">LIVE</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 border border-slate-800 text-base">
                👥
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white">8.7M</span>
                <span className="text-[10px] text-slate-400 uppercase">{t("statCitizens")}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 border border-slate-800 text-base">
                🗺️
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white">718 km²</span>
                <span className="text-[10px] text-slate-400 uppercase">{t("areaCoverageLabel")}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 border border-slate-800 text-base">
                📹
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white">48</span>
                <span className="text-[10px] text-slate-400 uppercase">{t("cctvCamerasLabel")}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 border border-slate-800 text-base">
                🚦
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white">1,250+</span>
                <span className="text-[10px] text-slate-400 uppercase">{t("smartIntersectionsLabel")}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 border border-slate-800 text-base">
                🕒
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-cyan-400">24/7</span>
                <span className="text-[10px] text-slate-400 uppercase">{t("commandCentreLabel")}</span>
              </div>
            </div>
          </div>

          {/* Center Hero CTA Section */}
          <div className="col-span-1 lg:col-span-6 flex flex-col items-center text-center px-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/40 bg-cyan-950/50 px-4 py-1.5 text-xs font-mono font-medium text-cyan-300 backdrop-blur-md mb-6">
              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
              SMARTER CHENNAI DIGITAL TWIN
            </div>

            <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white drop-shadow-2xl leading-none">
              Smart <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-500">Chennai</span>
            </h1>

            <p className="mt-5 max-w-lg text-base sm:text-lg text-slate-200 font-normal leading-relaxed drop-shadow">
              {t("subtitle")}
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center gap-4">
              <a
                href={`/${locale}/dashboard`}
                className="rounded-full bg-gradient-to-r from-cyan-400 to-sky-400 px-8 py-3.5 text-base font-bold text-slate-950 shadow-glow transition hover:scale-105 active:scale-95 flex items-center gap-2"
              >
                {t("cta")} →
              </a>

              <a
                href={`/${locale}/dashboard/traffic`}
                className="rounded-full border border-slate-700 bg-slate-900/80 px-6 py-3.5 text-sm font-semibold text-slate-200 backdrop-blur-md transition hover:bg-slate-800 hover:border-slate-600 flex items-center gap-2"
              >
                <span>▶</span> {t("watchOverview")}
              </a>
            </div>
          </div>

          {/* Right HUD Panel — Zone Overview */}
          <div className="hidden lg:flex lg:col-span-3 flex-col gap-4 p-5 rounded-2xl border border-cyan-500/30 bg-slate-950/40 backdrop-blur-md shadow-2xl text-left">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-bold tracking-wider text-cyan-400 uppercase flex items-center gap-2">
                🌐 ZONE COVERAGE
              </span>
              <span className="text-[10px] text-slate-400 font-mono">15 ZONES</span>
            </div>

            {/* Chennai Map SVG Graphic */}
            <div className="relative h-40 w-full rounded-xl bg-slate-900/80 border border-slate-800 overflow-hidden flex items-center justify-center p-2">
              <svg viewBox="0 0 100 120" className="h-full w-full text-cyan-400/80 stroke-current stroke-1 fill-cyan-500/10">
                <path d="M 30,10 Q 50,5 70,20 Q 85,40 75,70 Q 65,100 40,110 Q 20,90 25,60 Q 15,30 30,10 Z" />
                <circle cx="50" cy="35" r="3" className="fill-cyan-400 animate-ping" />
                <circle cx="50" cy="35" r="2" className="fill-cyan-400" />
                <circle cx="65" cy="55" r="2" className="fill-amber-400" />
                <circle cx="40" cy="75" r="2" className="fill-emerald-400" />
                <circle cx="35" cy="45" r="2" className="fill-sky-400" />
              </svg>
              <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[10px] text-slate-300 font-medium">
                <span>{t("greaterChennai")}</span>
                <span className="text-cyan-400 font-bold">{t("fifteenZones")}</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-300 pt-1">
              <span>{t("smarterTomorrow")}</span>
              <span className="text-emerald-400 font-bold">100% ONLINE</span>
            </div>
          </div>
        </div>

        {/* 5. Metrics & Target Bar */}
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 max-w-5xl mx-auto w-full">
          <div className="flex flex-col items-center justify-center p-3.5 border border-slate-800/80 rounded-xl bg-slate-950/70 backdrop-blur-md">
            <span className="text-2xl font-extrabold text-emerald-400">
              <AnimatedCounter value={35} suffix="%" duration={2.5} />
            </span>
            <span className="text-[10px] text-slate-400 uppercase tracking-wide mt-1 text-center">
              {t("statCongestion")}
            </span>
          </div>

          <div className="flex flex-col items-center justify-center p-3.5 border border-slate-800/80 rounded-xl bg-slate-950/70 backdrop-blur-md">
            <span className="text-2xl font-extrabold text-cyan-400">
              <AnimatedCounter value={50} suffix="%" duration={2.5} />
            </span>
            <span className="text-[10px] text-slate-400 uppercase tracking-wide mt-1 text-center">
              {t("statResponse")}
            </span>
          </div>

          <div className="flex flex-col items-center justify-center p-3.5 border border-slate-800/80 rounded-xl bg-slate-950/70 backdrop-blur-md">
            <span className="text-2xl font-extrabold text-amber-400">
              <AnimatedCounter value={8.7} suffix="M" duration={2.5} />
            </span>
            <span className="text-[10px] text-slate-400 uppercase tracking-wide mt-1 text-center">
              {t("statCitizens")}
            </span>
          </div>

          <div className="flex flex-col items-center justify-center p-3.5 border border-slate-800/80 rounded-xl bg-slate-950/70 backdrop-blur-md">
            <span className="text-2xl font-extrabold text-cyan-400">
              <AnimatedCounter value={15} duration={2.5} />
            </span>
            <span className="text-[10px] text-slate-400 uppercase tracking-wide mt-1 text-center">
              {t("statZones")}
            </span>
          </div>
        </div>

        {/* 6. Bottom ICCC HUD Ticker Bar */}
        <footer className="mt-8 flex flex-col md:flex-row items-center justify-between gap-4 border-t border-slate-800/60 pt-4 text-[11px] text-slate-400 tracking-wider uppercase font-mono w-full">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
            <span className="flex items-center gap-1.5 text-cyan-400">
              <span>🤖</span> {t("poweredByAi")}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <span>📈</span> {t("realTimeData")}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <span>⚡</span> {t("unifiedOps")}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <span>👥</span> {t("citizenCentric")}
            </span>
          </div>

          <div className="flex items-center gap-2 text-slate-400">
            <span>{t("smarterChennaiBrighterTomorrow")}</span>
          </div>
        </footer>
      </div>
    
      </div>
    </main>
  );
}
