"use client";

import { useEffect, useRef, useCallback, useState } from "react";

interface SimulatedCCTVFeedProps {
  cameraId: string;
  junctionName: string;
  zoneName: string;
  status: "online" | "offline";
  vehiclesPerHour: number;
  congestionLevel: number;
  avgSpeed: number;
  incident?: { type: string; severity: number } | null;
  timestamp?: string;
  className?: string;
  onClick?: () => void;
}

interface Vehicle {
  lane: number;
  y: number;
  speed: number;
  width: number;
  height: number;
  color: string;
}

const VEHICLE_COLORS_NORMAL = ["#3B82F6", "#6366F1", "#8B5CF6", "#64748B", "#475569", "#94A3B8"];
const VEHICLE_COLORS_CONGESTED = ["#EF4444", "#F97316", "#DC2626", "#B91C1C", "#F59E0B", "#EA580C"];

export function SimulatedCCTVFeed({
  cameraId,
  junctionName,
  zoneName,
  status,
  vehiclesPerHour,
  congestionLevel,
  avgSpeed,
  incident,
  timestamp,
  className = "",
  onClick,
}: SimulatedCCTVFeedProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const vehiclesRef = useRef<Vehicle[]>([]);
  const frameCountRef = useRef(0);
  const isVisibleRef = useRef(true);
  const [currentTime, setCurrentTime] = useState("");

  // Update clock
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString("en-US", { hour12: false }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Intersection observer for performance
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisibleRef.current = entry.isIntersecting;
      },
      { threshold: 0.1 }
    );
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  const initVehicles = useCallback(
    (canvasWidth: number, canvasHeight: number) => {
      const laneCount = 3;
      const laneWidth = (canvasWidth * 0.5) / laneCount;
      const density = Math.min(Math.max(Math.round((vehiclesPerHour / 12000) * 18), 3), 18);
      const isCongested = congestionLevel > 0.6;

      const vehicles: Vehicle[] = [];
      for (let i = 0; i < density; i++) {
        const lane = i % laneCount;
        const colors = isCongested ? VEHICLE_COLORS_CONGESTED : VEHICLE_COLORS_NORMAL;
        vehicles.push({
          lane,
          y: Math.random() * canvasHeight,
          speed: Math.max(0.3, (avgSpeed / 45) * (1.5 + Math.random() * 1.5)),
          width: laneWidth * 0.55 + Math.random() * 4,
          height: 14 + Math.random() * 10,
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }
      vehiclesRef.current = vehicles;
    },
    [vehiclesPerHour, congestionLevel, avgSpeed]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const W = rect.width;
    const H = rect.height;

    initVehicles(W, H);

    const laneCount = 3;
    const roadLeft = W * 0.25;
    const roadWidth = W * 0.5;
    const laneWidth = roadWidth / laneCount;

    const draw = () => {
      if (!isVisibleRef.current) {
        animationRef.current = requestAnimationFrame(draw);
        return;
      }

      frameCountRef.current += 1;
      // Target ~30fps by skipping every other frame
      if (frameCountRef.current % 2 !== 0) {
        animationRef.current = requestAnimationFrame(draw);
        return;
      }

      // Sky / background (bird's-eye dark asphalt)
      ctx.fillStyle = "#0D1117";
      ctx.fillRect(0, 0, W, H);

      // Road surface
      ctx.fillStyle = "#1A1F2B";
      ctx.fillRect(roadLeft, 0, roadWidth, H);

      // Road edges
      ctx.strokeStyle = "#2D3748";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(roadLeft, 0);
      ctx.lineTo(roadLeft, H);
      ctx.moveTo(roadLeft + roadWidth, 0);
      ctx.lineTo(roadLeft + roadWidth, H);
      ctx.stroke();

      // Lane markings (dashed)
      ctx.strokeStyle = "#4A5568";
      ctx.lineWidth = 1;
      ctx.setLineDash([12, 18]);
      for (let l = 1; l < laneCount; l++) {
        const x = roadLeft + l * laneWidth;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // Sidewalks
      ctx.fillStyle = "#161B22";
      ctx.fillRect(roadLeft - 15, 0, 15, H);
      ctx.fillRect(roadLeft + roadWidth, 0, 15, H);

      // Vehicles
      for (const v of vehiclesRef.current) {
        v.y -= v.speed;
        if (v.y + v.height < 0) {
          v.y = H + Math.random() * 40;
        }

        const x = roadLeft + v.lane * laneWidth + (laneWidth - v.width) / 2;

        // Vehicle shadow
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.fillRect(x + 2, v.y + 2, v.width, v.height);

        // Vehicle body
        ctx.fillStyle = v.color;
        ctx.fillRect(x, v.y, v.width, v.height);

        // Headlights
        ctx.fillStyle = "rgba(255,255,200,0.7)";
        ctx.fillRect(x + 2, v.y, 3, 3);
        ctx.fillRect(x + v.width - 5, v.y, 3, 3);
      }

      // CRT scanline overlay
      ctx.fillStyle = "rgba(255,255,255,0.015)";
      for (let y = 0; y < H; y += 4) {
        ctx.fillRect(0, y, W, 1);
      }

      // Film grain noise (very subtle)
      if (frameCountRef.current % 6 === 0) {
        for (let i = 0; i < 80; i++) {
          const gx = Math.random() * W;
          const gy = Math.random() * H;
          const brightness = Math.random() * 40;
          ctx.fillStyle = `rgba(${brightness},${brightness},${brightness},0.08)`;
          ctx.fillRect(gx, gy, 2, 2);
        }
      }

      // Incident overlay
      if (incident && status === "online") {
        // Red translucent bounding area
        ctx.fillStyle = "rgba(239, 68, 68, 0.12)";
        ctx.fillRect(roadLeft + 10, H * 0.3, roadWidth - 20, H * 0.35);

        // Detection border
        ctx.strokeStyle = "#EF4444";
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(roadLeft + 10, H * 0.3, roadWidth - 20, H * 0.35);
        ctx.setLineDash([]);

        // Detection label
        ctx.fillStyle = "rgba(239, 68, 68, 0.85)";
        const labelW = 180;
        const labelH = 20;
        ctx.fillRect(roadLeft + 15, H * 0.3 + 5, labelW, labelH);
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 10px monospace";
        ctx.fillText("⚠ SIMULATED DETECTION", roadLeft + 20, H * 0.3 + 18);

        // Incident type
        ctx.fillStyle = "rgba(239, 68, 68, 0.85)";
        ctx.fillRect(roadLeft + 15, H * 0.3 + 28, 120, 16);
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "9px monospace";
        ctx.fillText(
          `${incident.type.toUpperCase()} SEV:${incident.severity}`,
          roadLeft + 20,
          H * 0.3 + 40
        );
      }

      // --- OVERLAYS ---

      // LIVE badge (top-left)
      if (status === "online") {
        ctx.fillStyle = "rgba(239, 68, 68, 0.9)";
        roundRect(ctx, 8, 8, 52, 20, 4);
        ctx.fill();
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 10px sans-serif";

        // Pulsing dot
        const pulse = Math.sin(frameCountRef.current * 0.1) * 0.3 + 0.7;
        ctx.globalAlpha = pulse;
        ctx.beginPath();
        ctx.arc(20, 18, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        ctx.fillText("LIVE", 28, 22);
      } else {
        ctx.fillStyle = "rgba(100, 116, 139, 0.9)";
        roundRect(ctx, 8, 8, 66, 20, 4);
        ctx.fill();
        ctx.fillStyle = "#CBD5E1";
        ctx.font = "bold 10px sans-serif";
        ctx.fillText("OFFLINE", 16, 22);
      }

      // SIMULATION label (top-right)
      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      const simLabel = "SIMULATION / DEMO";
      ctx.font = "bold 9px monospace";
      const simW = ctx.measureText(simLabel).width + 12;
      roundRect(ctx, W - simW - 8, 8, simW, 18, 3);
      ctx.fill();
      ctx.fillStyle = "#94A3B8";
      ctx.fillText(simLabel, W - simW - 2, 21);

      // Camera ID + Junction (bottom-left)
      ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
      roundRect(ctx, 8, H - 44, 200, 36, 4);
      ctx.fill();
      ctx.fillStyle = "#E2E8F0";
      ctx.font = "bold 10px monospace";
      ctx.fillText(`CAM ${cameraId.slice(0, 8).toUpperCase()}`, 14, H - 28);
      ctx.fillStyle = "#94A3B8";
      ctx.font = "9px sans-serif";
      ctx.fillText(junctionName, 14, H - 14);

      // Timestamp (bottom-right)
      const timeStr = timestamp || currentTime || new Date().toLocaleTimeString("en-US", { hour12: false });
      ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
      const timeW = 80;
      roundRect(ctx, W - timeW - 8, H - 26, timeW, 18, 3);
      ctx.fill();
      ctx.fillStyle = "#94A3B8";
      ctx.font = "10px monospace";
      ctx.fillText(timeStr, W - timeW - 2, H - 12);

      animationRef.current = requestAnimationFrame(draw);
    };

    animationRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [cameraId, junctionName, status, incident, initVehicles, currentTime, timestamp, congestionLevel]);

  return (
    <div
      className={`relative overflow-hidden rounded-lg bg-[#0D1117] cursor-pointer ${className}`}
      onClick={onClick}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: "block" }}
      />
      {status === "offline" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <div className="text-center">
            <span className="text-3xl opacity-40">📷</span>
            <p className="mt-1 text-xs text-text-muted">Camera Offline</p>
          </div>
        </div>
      )}
    </div>
  );
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export default SimulatedCCTVFeed;
