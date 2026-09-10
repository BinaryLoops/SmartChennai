"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import Map, { MapRef } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

// Predefined cinematic route covering major Chennai locations
const WAYPOINTS = [
  {
    name: "Kathipara",
    center: [80.2014, 13.0142] as [number, number],
    pitch: 75,
    bearing: 45,
    zoom: 15.5,
    duration: 25000, // 25 seconds for slow, majestic flight
  },
  {
    name: "Guindy National Park",
    center: [80.2223, 13.0076] as [number, number],
    pitch: 65,
    bearing: 110,
    zoom: 14.5,
    duration: 20000,
  },
  {
    name: "T. Nagar Urban Density",
    center: [80.2319, 13.0405] as [number, number],
    pitch: 70,
    bearing: -20,
    zoom: 15.2,
    duration: 22000,
  },
  {
    name: "Anna Salai Arterial",
    center: [80.2520, 13.0560] as [number, number],
    pitch: 80,
    bearing: 15,
    zoom: 16.0,
    duration: 20000,
  },
  {
    name: "Marina Beach Coastal Horizon",
    center: [80.2825, 13.0500] as [number, number],
    pitch: 60,
    bearing: 75, // Looking out to the sea/horizon
    zoom: 14.0,
    duration: 25000,
  },
];

export function CinematicCityFlythrough() {
  const mapRef = useRef<MapRef>(null);
  const [currentWaypoint, setCurrentWaypoint] = useState(0);
  const [mapLoaded, setMapLoaded] = useState(false);
  const prefersReducedMotion = useRef(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      prefersReducedMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }
  }, []);

  useEffect(() => {
    if (!mapLoaded || !mapRef.current || prefersReducedMotion.current) return;

    const map = mapRef.current.getMap();
    const target = WAYPOINTS[currentWaypoint];

    // Fly to the next waypoint slowly
    map.flyTo({
      center: target.center,
      pitch: target.pitch,
      bearing: target.bearing,
      zoom: target.zoom,
      duration: target.duration,
      curve: 0.5, // Subtle curving for a drone-like flight path
      essential: true,
      easing: (t: number) => t, // Linear easing for continuous movement feel
    });

    // Schedule the next waypoint when this one finishes
    const timer = setTimeout(() => {
      setCurrentWaypoint((prev) => (prev + 1) % WAYPOINTS.length);
    }, target.duration + 500);

    return () => clearTimeout(timer);
  }, [currentWaypoint, mapLoaded]);

  const onMapLoad = () => {
    setMapLoaded(true);
    const map = mapRef.current?.getMap();
    if (map) {
      // Ensure we are using the Mapbox v3 Standard Style with 3D buildings and lighting
      map.setConfigProperty("basemap", "lightPreset", "dusk");
      map.setConfigProperty("basemap", "showPointOfInterestLabels", false);
      map.setConfigProperty("basemap", "showTransitLabels", false);
    }
  };

  // Graceful fallback if no Mapbox token is provided
  if (!MAPBOX_TOKEN) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="text-cyan-500 font-mono text-sm tracking-widest animate-pulse">
            INITIALIZING CHENNAI DIGITAL TWIN...
          </div>
          <div className="text-slate-500 text-xs text-center max-w-sm">
            Mapbox 3D Engine loading.
            <br />
            (Please add NEXT_PUBLIC_MAPBOX_TOKEN to .env.local)
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-0 bg-slate-950 overflow-hidden select-none pointer-events-none">
      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{
          center: WAYPOINTS[0].center,
          pitch: WAYPOINTS[0].pitch,
          bearing: WAYPOINTS[0].bearing,
          zoom: WAYPOINTS[0].zoom,
        }}
        mapStyle="mapbox://styles/mapbox/standard"
        onLoad={onMapLoad}
        attributionControl={false}
        interactive={false} // Disable user interaction for landing page background
      />

      {/* Atmospheric Vignette Overlays for UI Contrast */}
      <div className="absolute inset-0 pointer-events-none z-10 bg-gradient-to-b from-slate-950/70 via-transparent to-slate-950/90" />
      <div className="absolute inset-0 pointer-events-none z-10 bg-[radial-gradient(ellipse_40%_50%_at_50%_45%,_#020617_0%,_transparent_100%)] opacity-70" />
    </div>
  );
}
