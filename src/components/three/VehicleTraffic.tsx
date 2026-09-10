"use client";

import { useMemo, useRef, useEffect } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

interface VehicleData {
  progress: number;
  speed: number;
  laneOffset: number;
  isBus: boolean;
  color: THREE.Color;
}

export function VehicleTraffic({ mobile = false }: { mobile?: boolean }) {
  // Drastically increased vehicle count for scale
  const vehicleCount = mobile ? 80 : 350; 
  
  const bodyMeshRef = useRef<THREE.InstancedMesh>(null);
  const headLightRef = useRef<THREE.InstancedMesh>(null);
  const tailLightRef = useRef<THREE.InstancedMesh>(null);

  // Kathipara Flyover + Ground loops paths
  const paths = useMemo(() => {
    return [
      // Elevated Flyover
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-20, 2.2, 12),
        new THREE.Vector3(-10, 2.2, 5),
        new THREE.Vector3(-5, 2.2, -2),
        new THREE.Vector3(-2, 2.2, -8),
        new THREE.Vector3(5, 2.2, -10),
        new THREE.Vector3(10, 2.2, -5),
        new THREE.Vector3(6, 2.2, 3),
        new THREE.Vector3(-2, 2.2, 8),
        new THREE.Vector3(-10, 2.2, 12),
      ], true),
      // Ground Highway East-West
      new THREE.LineCurve3(new THREE.Vector3(-30, 0.15, 0), new THREE.Vector3(30, 0.15, 0)),
      // Ground Highway North-South
      new THREE.LineCurve3(new THREE.Vector3(-5, 0.15, -30), new THREE.Vector3(-5, 0.15, 30))
    ];
  }, []);

  const vehicles = useMemo<VehicleData[]>(() => {
    const list: VehicleData[] = [];
    const colors = ["#e2e8f0", "#94a3b8", "#ef4444", "#3b82f6", "#eab308", "#10b981", "#1e293b", "#ffffff"];
    
    for (let i = 0; i < vehicleCount; i++) {
      list.push({
        progress: Math.random(),
        speed: 0.02 + Math.random() * 0.04,
        // Wider lane offsets for multilane
        laneOffset: (Math.random() - 0.5) * 1.5,
        isBus: Math.random() < 0.15,
        color: new THREE.Color(colors[Math.floor(Math.random() * colors.length)])
      });
    }
    return list;
  }, [vehicleCount]);

  useFrame((_, delta) => {
    if (!bodyMeshRef.current || !headLightRef.current || !tailLightRef.current) return;

    const dummy = new THREE.Object3D();
    const hlDummy = new THREE.Object3D();
    const tlDummy = new THREE.Object3D();

    vehicles.forEach((v, i) => {
      v.progress = (v.progress + delta * v.speed) % 1;
      
      // Distribute vehicles across the 3 paths
      const pathIndex = i % 3;
      const path = paths[pathIndex];
      
      const point = path.getPoint(v.progress);
      const tangent = path.getTangent(v.progress);
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      
      // Some paths have reverse lanes
      const isReverse = i % 2 === 0;
      if (isReverse) {
        tangent.negate();
        v.laneOffset = Math.abs(v.laneOffset) + 0.2; // Move to other side
      } else {
        v.laneOffset = -Math.abs(v.laneOffset) - 0.2;
      }

      const x = point.x + normal.x * v.laneOffset;
      const z = point.z + normal.z * v.laneOffset;
      const y = point.y;

      const angle = Math.atan2(tangent.x, tangent.z);
      
      const w = v.isBus ? 0.35 : 0.22;
      const h = v.isBus ? 0.25 : 0.14;
      const l = v.isBus ? 0.7 : 0.45;

      // Update Body
      dummy.position.set(x, y + h/2, z);
      dummy.rotation.y = angle;
      dummy.scale.set(w, h, l);
      dummy.updateMatrix();
      bodyMeshRef.current!.setMatrixAt(i, dummy.matrix);
      bodyMeshRef.current!.setColorAt(i, v.color);

      // Update Headlights (Front)
      hlDummy.position.set(x + Math.sin(angle)*l/2.1, y + h*0.4, z + Math.cos(angle)*l/2.1);
      hlDummy.rotation.y = angle;
      hlDummy.scale.set(w*0.8, 0.04, 0.02);
      hlDummy.updateMatrix();
      headLightRef.current!.setMatrixAt(i, hlDummy.matrix);

      // Update Taillights (Back)
      tlDummy.position.set(x - Math.sin(angle)*l/2.1, y + h*0.4, z - Math.cos(angle)*l/2.1);
      tlDummy.rotation.y = angle;
      tlDummy.scale.set(w*0.8, 0.04, 0.02);
      tlDummy.updateMatrix();
      tailLightRef.current!.setMatrixAt(i, tlDummy.matrix);
    });

    bodyMeshRef.current.instanceMatrix.needsUpdate = true;
    if (bodyMeshRef.current.instanceColor) bodyMeshRef.current.instanceColor.needsUpdate = true;
    headLightRef.current.instanceMatrix.needsUpdate = true;
    tailLightRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh ref={bodyMeshRef} args={[undefined, undefined, vehicleCount]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.3} metalness={0.7} />
      </instancedMesh>

      <instancedMesh ref={headLightRef} args={[undefined, undefined, vehicleCount]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#ffffff" />
      </instancedMesh>

      <instancedMesh ref={tailLightRef} args={[undefined, undefined, vehicleCount]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#ef4444" />
      </instancedMesh>
    </group>
  );
}
