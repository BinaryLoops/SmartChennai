"use client";

import { useMemo } from "react";
import * as THREE from "three";

export function FlyoverNetwork() {
  // Define Kathipara-inspired elevated flyover curve path
  const flyoverPath = useMemo(() => {
    const points = [
      new THREE.Vector3(-14, 2.2, 8),
      new THREE.Vector3(-8, 2.2, 4),
      new THREE.Vector3(-5, 2.2, -2),
      new THREE.Vector3(-2, 2.2, -7),
      new THREE.Vector3(4, 2.2, -8),
      new THREE.Vector3(8, 2.2, -4),
      new THREE.Vector3(5, 2.2, 2),
      new THREE.Vector3(-2, 2.2, 6),
      new THREE.Vector3(-8, 2.2, 8),
    ];
    return new THREE.CatmullRomCurve3(points, true);
  }, []);

  // Support pillars for the flyover
  const pillars = useMemo(() => {
    const list = [];
    const count = 16;
    for (let i = 0; i < count; i++) {
      const point = flyoverPath.getPoint(i / count);
      list.push({ x: point.x, z: point.z, h: point.y });
    }
    return list;
  }, [flyoverPath]);

  // Streetlights along roads & flyover
  const streetlights = useMemo(() => {
    const list = [];
    const count = 24;
    for (let i = 0; i < count; i++) {
      const t = i / count;
      const point = flyoverPath.getPoint(t);
      const tangent = flyoverPath.getTangent(t);
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

      list.push({
        x: point.x + normal.x * 0.9,
        y: point.y,
        z: point.z + normal.z * 0.9,
      });
    }
    return list;
  }, [flyoverPath]);

  return (
    <group position={[0, 0, 0]}>
      {/* Ground Major Arterial Highway 1 (East-West) */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[120, 4.0]} />
        <meshStandardMaterial color="#0f172a" roughness={0.9} />
      </mesh>

      {/* Road Lane Lines East-West */}
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[120, 0.08]} />
        <meshBasicMaterial color="#fef08a" opacity={0.4} transparent />
      </mesh>

      {/* Ground Major Arterial Highway 2 (North-South) */}
      <mesh position={[-5, 0.02, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]} receiveShadow>
        <planeGeometry args={[120, 4.0]} />
        <meshStandardMaterial color="#0f172a" roughness={0.9} />
      </mesh>
      
      {/* Road Lane Lines North-South */}
      <mesh position={[-5, 0.03, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
        <planeGeometry args={[120, 0.08]} />
        <meshBasicMaterial color="#fef08a" opacity={0.4} transparent />
      </mesh>

      {/* Elevated Kathipara 3D Flyover Deck */}
      <mesh receiveShadow castShadow position={[0, 0, 0]}>
        <tubeGeometry args={[flyoverPath, 200, 1.2, 8, true]} />
        <meshStandardMaterial color="#1e293b" roughness={0.8} metalness={0.2} />
      </mesh>

      {/* Flyover Central Glowing Lane Stripe */}
      <mesh position={[0, 0.05, 0]}>
        <tubeGeometry args={[flyoverPath, 200, 0.06, 6, true]} />
        <meshBasicMaterial color="#eab308" opacity={0.3} transparent />
      </mesh>

      {/* Concrete Support Pillars */}
      {pillars.map((p, i) => (
        <mesh key={i} position={[p.x, p.h / 2, p.z]} castShadow>
          <cylinderGeometry args={[0.25, 0.35, p.h, 12]} />
          <meshStandardMaterial color="#334155" roughness={0.7} />
        </mesh>
      ))}

      {/* Streetlights along Flyover */}
      {streetlights.map((sl, i) => (
        <group key={i} position={[sl.x, sl.y, sl.z]}>
          <mesh position={[0, 0.5, 0]}>
            <cylinderGeometry args={[0.03, 0.04, 1.0, 8]} />
            <meshStandardMaterial color="#475569" />
          </mesh>
          <mesh position={[0, 1.0, 0]}>
            <sphereGeometry args={[0.1, 8, 8]} />
            <meshBasicMaterial color="#fef08a" />
          </mesh>
        </group>
      ))}
    </group>
  );
}
