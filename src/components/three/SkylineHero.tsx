"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";

/**
 * Placeholder low-poly "skyline" — a cluster of extruded boxes of random
 * height, slowly auto-rotating, standing in for Chennai's silhouette.
 * Swap the box generation for an imported GLTF model later without
 * touching anything else on the landing page.
 */
function Buildings() {
  const group = useRef<Group>(null);

  const buildings = useMemo(
    () =>
      Array.from({ length: 24 }, () => ({
        x: (Math.random() - 0.5) * 8,
        z: (Math.random() - 0.5) * 8,
        height: 0.6 + Math.random() * 2.4,
      })),
    []
  );

  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.08;
  });

  return (
    <group ref={group}>
      {buildings.map((b, i) => (
        <mesh key={i} position={[b.x, b.height / 2, b.z]}>
          <boxGeometry args={[0.4, b.height, 0.4]} />
          <meshStandardMaterial color="#151A24" emissive="#22D3EE" emissiveIntensity={0.08} />
        </mesh>
      ))}
    </group>
  );
}

export function SkylineHero() {
  return (
    <div className="h-72 w-full">
      <Canvas camera={{ position: [6, 4, 6], fov: 45 }}>
        <ambientLight intensity={0.6} />
        <pointLight position={[5, 8, 5]} intensity={0.8} color="#22D3EE" />
        <Buildings />
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.6}
        />
      </Canvas>
    </div>
  );
}
