"use client";

import { usePathname } from "next/navigation";
import { Canvas, useFrame } from "@react-three/fiber";
import { Stars, Float, Line } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";

function DataNodes() {
  const group = useRef<THREE.Group>(null);
  
  // Create 30 random glowing nodes
  const nodes = useMemo(() => {
    const temp = [];
    for (let i = 0; i < 30; i++) {
      temp.push({
        position: [
          (Math.random() - 0.5) * 40,
          (Math.random() - 0.5) * 20 - 5,
          (Math.random() - 0.5) * 20 - 10,
        ] as [number, number, number],
        size: Math.random() * 0.15 + 0.05,
        speed: Math.random() * 0.2 + 0.1,
      });
    }
    return temp;
  }, []);

  useFrame((state) => {
    if (group.current) {
      group.current.rotation.y = state.clock.elapsedTime * 0.02;
    }
  });

  return (
    <group ref={group}>
      {nodes.map((n, i) => (
        <Float key={i} speed={n.speed} rotationIntensity={0.2} floatIntensity={0.5}>
          <mesh position={n.position}>
            <octahedronGeometry args={[n.size, 0]} />
            <meshBasicMaterial color="#06b6d4" wireframe opacity={0.3} transparent />
          </mesh>
        </Float>
      ))}
      {/* Simple grid underneath */}
      <gridHelper args={[60, 60, "#0891b2", "#1e293b"]} position={[0, -10, 0]} />
    </group>
  );
}

export function Global3DBackground() {
  const pathname = usePathname();
  
  // Do not render on the landing page (which has Mapbox)
  if (pathname === "/en" || pathname === "/ta" || pathname === "/hi" || pathname === "/") {
    return null;
  }

  // Ensure user prefers motion
  if (typeof window !== 'undefined') {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return null;
  }

  return (
    <div className="fixed inset-0 z-0 pointer-events-none opacity-40">
      <Canvas camera={{ position: [0, 2, 15], fov: 60 }}>
        <fog attach="fog" args={["#020617", 10, 30]} />
        <ambientLight intensity={0.2} />
        
        {/* Subtle moving particles (Stars) */}
        <Stars radius={50} depth={50} count={1500} factor={2} saturation={0} fade speed={0.5} />
        
        {/* Smart City Data Nodes */}
        <DataNodes />
      </Canvas>
    </div>
  );
}
