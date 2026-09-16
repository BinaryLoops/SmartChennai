"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as MapboxMap } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

export type CameraStop = {
  name: string;
  center: [number, number];
  zoom: number;
  pitch: number;
  bearing: number;
  travel: number;
  hold: number;
};

const route: CameraStop[] = [
  { name: "KATHIPARA", center: [80.1995, 13.0068], zoom: 15.4, pitch: 62, bearing: 26, travel: 0, hold: 2200 },
  { name: "KATHIPARA", center: [80.2068, 13.0100], zoom: 17.1, pitch: 65, bearing: 44, travel: 12000, hold: 900 },
  { name: "GUINDY", center: [80.2198, 13.0106], zoom: 17.35, pitch: 66, bearing: 58, travel: 13000, hold: 1000 },
  { name: "ANNA SALAI", center: [80.2405, 13.0342], zoom: 17.5, pitch: 68, bearing: 32, travel: 16000, hold: 1000 },
  { name: "T. NAGAR", center: [80.2352, 13.0415], zoom: 17.8, pitch: 68, bearing: 300, travel: 18000, hold: 1800 },
  { name: "MARINA", center: [80.2782, 13.0524], zoom: 16.2, pitch: 64, bearing: 78, travel: 17000, hold: 1400 },
  { name: "MARINA", center: [80.2930, 13.0625], zoom: 13.8, pitch: 58, bearing: 100, travel: 14000, hold: 3600 },
];

const mobileRoute: CameraStop[] = route
  .filter((_, i) => i !== 2 && i !== 4)
  .map((stop) => ({ ...stop, zoom: stop.zoom - 0.4, pitch: Math.min(stop.pitch, 74) }));

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpAngle = (a: number, b: number, t: number) => {
  let d = ((b - a + 540) % 360) - 180;
  return a + d * t;
};

type Status = "loading" | "ready" | "failed";

export function CinematicCityFlythrough({
  onLocationChange,
  onStatusChange,
  cinemaMode = false,
}: {
  onLocationChange?: (name: string) => void;
  onStatusChange?: (status: Status) => void;
  cinemaMode?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status>("loading");
  const speedRef = useRef(1);
  const onLocationChangeRef = useRef(onLocationChange);
  
  useEffect(() => {
    onLocationChangeRef.current = onLocationChange;
  }, []);

  useEffect(() => {
    speedRef.current = cinemaMode ? 1.35 : 1;
  }, [cinemaMode]);

  useEffect(() => {
    onStatusChange?.(status);
  }, [status, onStatusChange]);

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    const container = containerRef.current;
    if (!container || !token) {
      if (!token) setStatus("failed");
      return;
    }

    let map: MapboxMap | undefined;
    let frame: number | undefined;
    let disposed = false;

    void import("mapbox-gl").then((mapboxglModule) => {
      if (disposed) return;
      const mapboxgl = mapboxglModule.default;
      
      if (!mapboxgl.supported?.()) {
        setStatus("failed");
        return;
      }

      const isMobile = window.matchMedia("(max-width: 767px)").matches;
      const path = isMobile ? mobileRoute : route;
      const start = path[0]!;

      mapboxgl.accessToken = token;
      map = new mapboxgl.Map({
        container,
        style: "mapbox://styles/mapbox/standard",
        center: start.center,
        zoom: start.zoom,
        pitch: start.pitch,
        bearing: start.bearing,
        interactive: false,
        attributionControl: false,
        antialias: !isMobile,
        fadeDuration: 0,
      });

      map.on("error", (event: any) => {
        const message = String(event?.error?.message ?? "");
        if (/token|401|403|unauthorized/i.test(message)) setStatus("failed");
      });

      map.on("style.load", () => {
        if (!map || disposed) return;
        
        map.setConfigProperty("basemap", "lightPreset", "dusk");
        map.setConfigProperty("basemap", "showPointOfInterestLabels", false);
        map.setConfigProperty("basemap", "showTransitLabels", false);
        map.setConfigProperty("basemap", "showRoadLabels", false);
        
        try {
          map.setLights([
            { id: "ambient", type: "ambient", properties: { color: "hsl(205, 45%, 74%)", intensity: 0.6 } },
            {
              id: "directional",
              type: "directional",
              properties: {
                color: "hsl(34, 70%, 82%)",
                intensity: 0.5,
                direction: [210, 42],
                "cast-shadows": !isMobile,
                "shadow-intensity": 0.7,
              },
            },
          ]);
        } catch {}
        
        map.setFog({
          color: "hsl(213, 34%, 22%)",
          "high-color": "hsl(196, 55%, 32%)",
          "horizon-blend": isMobile ? 0.1 : 0.16,
          "space-color": "hsl(220, 40%, 10%)",
          "star-intensity": 0.06,
        });
        
        if (!isMobile) {
          map.addSource("terrain-dem", {
            type: "raster-dem",
            url: "mapbox://mapbox.mapbox-terrain-dem-v1",
            tileSize: 512,
            maxzoom: 14,
          });
          map.setTerrain({ source: "terrain-dem", exaggeration: 1.1 });
        }

        setStatus("ready");
        onLocationChangeRef.current?.(start.name);

        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

        let index = 0;
        let segmentStart = performance.now();
        let holding = false;

        const tick = (now: number) => {
          if (!map || disposed) return;
          const from = path[index]!;
          const to = path[(index + 1) % path.length]!;
          const duration = Math.max(1, to.travel / speedRef.current);
          const elapsed = now - segmentStart;

          if (holding) {
            if (elapsed >= from.hold) {
              holding = false;
              segmentStart = now;
              if (to.name !== from.name) onLocationChangeRef.current?.(to.name);
            }
          } else {
            const t = Math.min(1, elapsed / duration);
            const e = ease(t);
            map.jumpTo({
              center: [lerp(from.center[0], to.center[0], e), lerp(from.center[1], to.center[1], e)],
              zoom: lerp(from.zoom, to.zoom, e),
              pitch: lerp(from.pitch, to.pitch, e),
              bearing: lerpAngle(from.bearing, to.bearing, e),
            });
            if (t >= 1) {
              index = (index + 1) % path.length;
              onLocationChangeRef.current?.(path[index]!.name);
              holding = true;
              segmentStart = now;
            }
          }
          frame = requestAnimationFrame(tick);
        };

        onLocationChangeRef.current?.(path[1]!.name);
        holding = true;
        segmentStart = performance.now();
        frame = requestAnimationFrame(tick);
      });
    }).catch(() => setStatus("failed"));

    return () => {
      disposed = true;
      if (frame) cancelAnimationFrame(frame);
      map?.remove();
    };
  }, [onLocationChange]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={`absolute inset-0 transition-opacity duration-[1400ms] ${status === "ready" ? "opacity-100" : "opacity-0"}`}
    />
  );
}
