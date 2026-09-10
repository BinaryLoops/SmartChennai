"use client";

import { useState, useEffect, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { CitySkyline } from "./CitySkyline";
import { FlyoverNetwork } from "./FlyoverNetwork";
import { VehicleTraffic } from "./VehicleTraffic";
import { CoastalWater } from "./CoastalWater";
import { SmartCityMarkers } from "./SmartCityMarkers";
import { CityEnvironment } from "./CityEnvironment";

function CanvasLoader() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-base/90 text-center backdrop-blur-md z-20">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-cyan border-t-transparent mb-3" />
      <span className="text-xs font-bold tracking-widest text-accent-cyan uppercase">
        INITIALIZING CHENNAI DIGITAL TWIN
      </span>
      <span className="text-[10px] text-text-muted mt-1 uppercase">
        Loading 3D urban environment & traffic simulation...
      </span>
    </div>
  );
}

function WebGLFallback() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-base p-6 text-center">
      <div className="max-w-md rounded-2xl border border-cyan-500/20 bg-slate-900/60 p-8 backdrop-blur-md">
        <h3 className="text-lg font-bold text-accent-cyan uppercase tracking-wide">
          SMART CHENNAI DIGITAL TWIN
        </h3>
        <p className="mt-2 text-xs text-text-secondary">
          WebGL visualization unavailable. Performance mode active for Integrated Command & Control Centre operations.
        </p>
      </div>
    </div>
  );
}

export function SkylineHero() {
  const [isMobile, setIsMobile] = useState(false);
  const [webGlSupported, setWebGlSupported] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsMobile(window.innerWidth < 768);
      try {
        const canvas = document.createElement("canvas");
        const hasWebGL = !!(
          window.WebGLRenderingContext &&
          (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
        );
        setWebGlSupported(hasWebGL);
      } catch {
        setWebGlSupported(false);
      }
    }
  }, []);

  if (!webGlSupported) {
    return <WebGLFallback />;
  }

  return (
    <div className="relative h-full w-full overflow-hidden select-none">
      <Suspense fallback={<CanvasLoader />}>
        <Canvas
          camera={{ position: [28, 22, 38], fov: 40 }}
          dpr={[1, 1.5]}
          gl={{ antialias: true, alpha: true }}
          className="h-full w-full"
        >
          <CityEnvironment />
          <CitySkyline mobile={isMobile} />
          <FlyoverNetwork />
          <VehicleTraffic mobile={isMobile} />
          <CoastalWater />
          <SmartCityMarkers />
        </Canvas>
      </Suspense>

      {/* Subtle Digital Twin Watermark overlay */}
      <div className="absolute bottom-4 right-6 pointer-events-none hidden sm:flex flex-col items-end opacity-60">
        <span className="text-[10px] font-mono font-bold tracking-widest text-accent-cyan uppercase">
          CHENNAI 3D DIGITAL TWIN • REAL-TIME SIMULATION
        </span>
        <span className="text-[9px] text-text-muted">
          INTEGRATED COMMAND & CONTROL CENTRE V2.0
        </span>
      </div>
    </div>
  );
}
