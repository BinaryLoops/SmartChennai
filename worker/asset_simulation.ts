/**
 * STAR ADD-ON #1 — Standalone Asset Simulation
 *
 * This module is called by simulate.ts's runTick() to periodically drift
 * the health scores and status of standalone CityAsset records (hospitals,
 * police stations, bus stops, schools, shelters, road projects, etc.).
 *
 * LINKED assets (CCTVFeed, WaterSensor, Junction, EmergencyUnit, etc.)
 * are NOT touched here — their live state is resolved by the API from
 * the domain entity at query time.
 *
 * This creates the "live feel" for the Asset Registry without independent
 * uncontrolled timers. It runs as part of the existing tick loop.
 *
 * Tick rate: every ~60 seconds (every 12 normal ticks, or every 60 demo
 * ticks). We skip most ticks using a counter to keep DB writes minimal.
 */

import { PrismaClient } from '@prisma/client';

let assetTickCounter = 0;
const ASSET_UPDATE_EVERY_N_TICKS = 12; // ~60s at 5s/tick normal mode

// Status transition weights for Gaussian drift
const STATUS_ORDER: Array<'HEALTHY' | 'DEGRADED' | 'OFFLINE' | 'MAINTENANCE' | 'UNKNOWN'> =
  ['HEALTHY', 'DEGRADED', 'OFFLINE', 'MAINTENANCE'];

function gaussianNoise(std = 1): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * std;
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

/**
 * Drift a health score toward its natural attractor with small Gaussian noise.
 * HEALTHY assets drift toward 90 (±3).
 * DEGRADED assets drift toward 55 (±5).
 * OFFLINE assets drift toward 10 (±3).
 * MAINTENANCE assets drift toward 35 (±4).
 */
function driftHealth(currentScore: number, status: string): number {
  const attractors: Record<string, number> = {
    HEALTHY: 90,
    DEGRADED: 55,
    OFFLINE: 10,
    MAINTENANCE: 35,
    UNKNOWN: 50,
  };
  const stds: Record<string, number> = {
    HEALTHY: 3,
    DEGRADED: 5,
    OFFLINE: 3,
    MAINTENANCE: 4,
    UNKNOWN: 6,
  };
  const attractor = attractors[status] ?? 50;
  const std = stds[status] ?? 4;
  // Mean-revert with noise
  const next = currentScore + (attractor - currentScore) * 0.1 + gaussianNoise(std);
  return clamp(Math.round(next), 0, 100);
}

/**
 * Occasionally transition a standalone asset between states.
 * Most ticks: no change.
 * ~2% chance: HEALTHY → DEGRADED
 * ~1% chance: DEGRADED → OFFLINE
 * ~3% chance: DEGRADED → HEALTHY (recovery)
 * ~2% chance: OFFLINE → MAINTENANCE
 * ~5% chance: MAINTENANCE → HEALTHY
 */
function maybeTransitionStatus(
  current: 'HEALTHY' | 'DEGRADED' | 'OFFLINE' | 'MAINTENANCE' | 'UNKNOWN',
  rng: number,
): 'HEALTHY' | 'DEGRADED' | 'OFFLINE' | 'MAINTENANCE' | 'UNKNOWN' {
  switch (current) {
    case 'HEALTHY':
      if (rng < 0.02) return 'DEGRADED';
      return 'HEALTHY';
    case 'DEGRADED':
      if (rng < 0.01) return 'OFFLINE';
      if (rng < 0.04) return 'HEALTHY';   // recovery
      if (rng < 0.05) return 'MAINTENANCE';
      return 'DEGRADED';
    case 'OFFLINE':
      if (rng < 0.03) return 'MAINTENANCE';
      return 'OFFLINE';
    case 'MAINTENANCE':
      if (rng < 0.05) return 'HEALTHY';   // maintenance complete
      return 'MAINTENANCE';
    case 'UNKNOWN':
      return rng < 0.5 ? 'HEALTHY' : 'DEGRADED';
    default:
      return current;
  }
}

// Asset types that should be animated (standalone, no domain entity backing)
const STANDALONE_TYPES = new Set([
  'hospital', 'police_station', 'fire_station', 'bus_stop',
  'school', 'park', 'shelter', 'road_project',
]);

export async function runAssetSimulation(prisma: PrismaClient): Promise<void> {
  assetTickCounter++;
  if (assetTickCounter % ASSET_UPDATE_EVERY_N_TICKS !== 0) return;

  try {
    // Only update standalone assets (not linked to a domain entity)
    const standaloneAssets = await prisma.cityAsset.findMany({
      where: {
        refType: null,  // standalone assets have no domain entity link
        assetType: { in: Array.from(STANDALONE_TYPES) },
      },
      select: { id: true, status: true, healthScore: true, assetType: true },
    });

    if (standaloneAssets.length === 0) return;

    // Pick a subset to update each tick (~20% of standalones) for realism
    const toUpdate = standaloneAssets.filter(() => Math.random() < 0.20);

    const now = new Date();
    const updates = toUpdate.map((asset) => {
      const rng = Math.random();
      const newStatus = maybeTransitionStatus(
        asset.status as any,
        rng,
      );
      const newHealth = driftHealth(asset.healthScore, newStatus);

      return prisma.cityAsset.update({
        where: { id: asset.id },
        data: {
          status: newStatus,
          healthScore: newHealth,
          lastSeenAt: now,
        },
      });
    });

    if (updates.length > 0) {
      await Promise.all(updates);
    }
  } catch (err) {
    console.error('[asset-sim] simulation tick failed:', err);
  }
}
