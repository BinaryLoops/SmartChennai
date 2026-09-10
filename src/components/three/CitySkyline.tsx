"use client";

import { useMemo, useRef, useEffect } from "react";
import * as THREE from "three";

// Generate a subtle, sparse, realistic window texture
function createSubtleWindowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    ctx.fillStyle = "#0c111a"; // Dark glass
    ctx.fillRect(0, 0, 1024, 1024);

    const patterns = [
      { x: 0, y: 0, w: 512, h: 512, cols: 8, rows: 30, prob: 0.15 }, // Sparse office
      { x: 512, y: 0, w: 512, h: 512, cols: 6, rows: 20, prob: 0.25 }, // Residential
      { x: 0, y: 512, w: 512, h: 512, cols: 12, rows: 40, prob: 0.10 }, // Modern glass
      { x: 512, y: 512, w: 512, h: 512, cols: 5, rows: 15, prob: 0.20 } // Low-rise
    ];

    const warmHues = ["#fef3c7", "#fde68a", "#fcd34d", "#ffedd5"]; // Subtle warm

    patterns.forEach(p => {
      const cellW = p.w / p.cols;
      const cellH = p.h / p.rows;

      for (let r = 0; r < p.rows; r++) {
        // High probability of entirely dark floors (realistic after hours)
        const floorProb = Math.random() < 0.3 ? 0 : p.prob;

        for (let c = 0; c < p.cols; c++) {
          if (Math.random() < floorProb) {
            ctx.fillStyle = warmHues[Math.floor(Math.random() * warmHues.length)];
            const marginX = cellW * 0.25;
            const marginY = cellH * 0.25;
            ctx.fillRect(
              p.x + c * cellW + marginX,
              p.y + r * cellH + marginY,
              cellW - marginX * 2,
              cellH - marginY * 2
            );
          }
        }
      }
    });
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  return texture;
}

export function CitySkyline({ mobile = false }: { mobile?: boolean }) {
  const windowTexture = useMemo(() => {
    if (typeof window === "undefined") return null;
    return createSubtleWindowTexture();
  }, []);

  // Reduce overall density. Use instancing only for the distant background.
  const bgBuildingCount = mobile ? 100 : 350;
  const instancedMeshRef = useRef<THREE.InstancedMesh>(null);

  const bgData = useMemo(() => {
    const data = [];
    const colors = ["#1e293b", "#334155", "#0f172a", "#1c1917"];
    for (let i = 0; i < bgBuildingCount; i++) {
      const radius = 30 + Math.pow(Math.random(), 1.5) * 80; 
      const angle = Math.random() * Math.PI * 2;
      let x = Math.cos(angle) * radius;
      let z = Math.sin(angle) * radius;
      
      // Keep clear of ocean and text center
      if (x > 25) continue;
      if (x > -15 && x < 10 && z > -15 && z < 10) continue;

      const height = 2 + Math.random() * 8;
      const width = 1 + Math.random() * 2;
      data.push({
        position: [x, height / 2, z],
        scale: [width, height, width],
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }
    return data;
  }, [bgBuildingCount]);

  useEffect(() => {
    if (instancedMeshRef.current) {
      const dummy = new THREE.Object3D();
      const color = new THREE.Color();
      bgData.forEach((b, i) => {
        dummy.position.set(b.position[0], b.position[1], b.position[2]);
        dummy.scale.set(b.scale[0], b.scale[1], b.scale[2]);
        dummy.updateMatrix();
        instancedMeshRef.current!.setMatrixAt(i, dummy.matrix);
        instancedMeshRef.current!.setColorAt(i, color.set(b.color));
      });
      instancedMeshRef.current.instanceMatrix.needsUpdate = true;
      if (instancedMeshRef.current.instanceColor) instancedMeshRef.current.instanceColor.needsUpdate = true;
    }
  }, [bgData]);

  return (
    <group>
      {/* 1. DISTANT HORIZON (Instanced, hazy, scale-giving) */}
      <instancedMesh ref={instancedMeshRef} args={[undefined, undefined, bgData.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          roughness={0.8}
          metalness={0.2}
          map={windowTexture || undefined}
          emissiveMap={windowTexture || undefined}
          emissive="#ffffff"
          emissiveIntensity={0.2}
        />
      </instancedMesh>

      {/* 2. THE HERO CLUSTER (Right-side focal point) */}
      {/* Landmark 1: Tall Glass Tiered Skyscraper */}
      <group position={[12, 0, -8]}>
        <mesh position={[0, 7, 0]} castShadow receiveShadow>
          <boxGeometry args={[3, 14, 3]} />
          <meshStandardMaterial color="#0f172a" roughness={0.2} metalness={0.8} map={windowTexture!} emissiveMap={windowTexture!} emissive="#fff" emissiveIntensity={0.4} />
        </mesh>
        <mesh position={[0, 15.5, 0]} castShadow>
          <boxGeometry args={[2.4, 3, 2.4]} />
          <meshStandardMaterial color="#0f172a" roughness={0.2} metalness={0.8} map={windowTexture!} emissiveMap={windowTexture!} emissive="#fff" emissiveIntensity={0.4} />
        </mesh>
        <mesh position={[0, 18, 0]}>
          <cylinderGeometry args={[0.05, 0.1, 4, 8]} />
          <meshStandardMaterial color="#64748b" />
        </mesh>
      </group>

      {/* Landmark 2: Curved / Cylindrical Modern Tower */}
      <group position={[5, 0, -15]}>
        <mesh position={[0, 9, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[2.2, 2.2, 18, 16]} />
          <meshStandardMaterial color="#1e293b" roughness={0.3} metalness={0.7} map={windowTexture!} emissiveMap={windowTexture!} emissive="#fff" emissiveIntensity={0.3} />
        </mesh>
        <mesh position={[0, 18.2, 0]}>
          <cylinderGeometry args={[2.3, 2.3, 0.4, 16]} />
          <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={0.4} />
        </mesh>
      </group>

      {/* Landmark 3: Wide Corporate HQ */}
      <group position={[18, 0, 2]}>
        <mesh position={[0, 5, 0]} castShadow receiveShadow>
          <boxGeometry args={[6, 10, 2.5]} />
          <meshStandardMaterial color="#172554" roughness={0.4} metalness={0.5} map={windowTexture!} emissiveMap={windowTexture!} emissive="#fff" emissiveIntensity={0.5} />
        </mesh>
      </group>
      
      {/* 3. SUPPORTING MIDGROUND CLUSTERS (Elegant placement, negative space left open) */}
      {[
        { x: 8, z: -2, w: 2, h: 10, d: 2 },
        { x: 15, z: -18, w: 2.5, h: 12, d: 2.5 },
        { x: -5, z: -22, w: 2.2, h: 9, d: 2.2 },
        { x: 2, z: -20, w: 1.8, h: 7, d: 1.8 },
        { x: 22, z: -10, w: 2.5, h: 8, d: 2.5 },
        { x: 10, z: -25, w: 3, h: 11, d: 3 },
      ].map((b, i) => (
        <mesh key={i} position={[b.x, b.h/2, b.z]} castShadow receiveShadow>
          <boxGeometry args={[b.w, b.h, b.d]} />
          <meshStandardMaterial color="#1e293b" roughness={0.5} metalness={0.4} map={windowTexture!} emissiveMap={windowTexture!} emissive="#fff" emissiveIntensity={0.3} />
        </mesh>
      ))}
      
      {/* 4. CHENNAI VEGETATION / TROPICAL CANOPY */}
      {/* Subtle green spheres simulating dense tree canopy between roads */}
      {[
        {x: 4, z: 2}, {x: 6, z: 0}, {x: -2, z: -2}, {x: 10, z: 5}, {x: 14, z: 1}
      ].map((t, i) => (
        <mesh key={`tree-${i}`} position={[t.x, 0.4, t.z]}>
          <sphereGeometry args={[1.2, 8, 8]} />
          <meshStandardMaterial color="#064e3b" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}
