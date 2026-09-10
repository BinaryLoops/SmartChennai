"use client";

import { useRef } from "react";
import * as THREE from "three";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";

interface Landmark {
  id: string;
  name: string;
  subtitle: string;
  position: [number, number, number];
  icon: string;
}

const LANDMARKS: Landmark[] = [
  {
    id: "kathipara",
    name: "KATHIPARA",
    subtitle: "TRAFFIC HUB",
    position: [-2, 2.5, 8],
    icon: "🌉",
  },
  {
    id: "tnagar",
    name: "T. NAGAR",
    subtitle: "COMMERCIAL",
    position: [20, 8.2, 5],
    icon: "🛒",
  },
  {
    id: "marina",
    name: "MARINA BEACH",
    subtitle: "COASTAL",
    position: [25, 1.2, -4],
    icon: "🏖️",
  }
];

export function SmartCityMarkers() {
  const ringRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (ringRef.current) {
      const scale = 1 + Math.sin(clock.getElapsedTime() * 2) * 0.1;
      ringRef.current.scale.set(scale, 1, scale);
    }
  });

  return (
    <group ref={ringRef}>
      {LANDMARKS.map((lm) => (
        <group key={lm.id} position={lm.position}>
          <Html position={[0, 0.4, 0]} center distanceFactor={40} zIndexRange={[100, 0]}>
            <div className="flex items-center gap-1.5 rounded-lg border border-cyan-500/20 bg-slate-950/40 px-2 py-1 backdrop-blur-sm transition-all hover:scale-105 select-none pointer-events-none opacity-80">
              <span className="text-xs">{lm.icon}</span>
              <div className="flex flex-col text-left">
                <span className="text-[10px] font-bold tracking-wider text-cyan-200 uppercase leading-none">
                  {lm.name}
                </span>
              </div>
            </div>
          </Html>
        </group>
      ))}
    </group>
  );
}
