"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";

export function CityEnvironment() {
  const { camera } = useThree();
  const prefersReducedMotion = useRef(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const media = window.matchMedia("(prefers-reduced-motion: reduce)");
      prefersReducedMotion.current = media.matches;
    }
  }, []);

  // Extremely slow, imperceptible cinematic camera drift
  useFrame(({ clock }) => {
    if (prefersReducedMotion.current) return;

    const t = clock.getElapsedTime() * 0.015;
    camera.position.x = 28 + Math.cos(t) * 2;
    camera.position.z = 38 + Math.sin(t) * 2;
    camera.lookAt(8, 4, -5); // Look slightly off-center towards the main skyscraper cluster
  });

  return (
    <>
      {/* Atmospheric Exponential Depth Fog */}
      <fogExp2 attach="fog" args={["#1e293b", 0.012]} />

      {/* Brighter Dusk Hemisphere Lighting for visible city facades */}
      <hemisphereLight args={["#3b82f6", "#0f172a", 1.2]} />

      {/* Warm Dusk Sunset Directional Light (Horizon Glow) */}
      <directionalLight
        position={[40, 10, -20]}
        intensity={2.5}
        color="#fb923c"
        castShadow
        shadow-mapSize={[2048, 2048]}
      />

      {/* Cool Blue Smart-City Fill Light */}
      <directionalLight position={[-20, 20, 20]} intensity={1.5} color="#38bdf8" />

      {/* Subtle Ambient Base */}
      <ambientLight intensity={0.6} />
    </>
  );
}
