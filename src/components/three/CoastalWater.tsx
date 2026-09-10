"use client";

import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

export function CoastalWater() {
  const meshRef = useRef<THREE.Mesh>(null);

  // Subtle wave animation
  useFrame(({ clock }) => {
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.MeshStandardMaterial;
      if (material) {
        material.roughness = 0.15 + Math.sin(clock.getElapsedTime() * 0.8) * 0.05;
      }
    }
  });

  return (
    <group position={[20, 0, 0]}>
      {/* Ocean Water Plane (Bay of Bengal / Marina Coast) */}
      <mesh
        ref={meshRef}
        position={[0, -0.05, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[25, 60]} />
        <meshStandardMaterial
          color="#031124"
          roughness={0.18}
          metalness={0.85}
          emissive="#0284c7"
          emissiveIntensity={0.05}
        />
      </mesh>

      {/* Marina Beach Shoreline Sand / Promenade Strip */}
      <mesh position={[-12.2, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.8, 60]} />
        <meshStandardMaterial color="#3b332b" roughness={0.9} />
      </mesh>

      {/* Coastal Kamarajar Salai Road Lights */}
      {Array.from({ length: 15 }).map((_, i) => (
        <mesh key={i} position={[-12.0, 0.2, (i - 7) * 3.8]}>
          <sphereGeometry args={[0.12, 8, 8]} />
          <meshBasicMaterial color="#fde047" />
        </mesh>
      ))}
    </group>
  );
}
