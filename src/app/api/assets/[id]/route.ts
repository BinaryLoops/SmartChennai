import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/assets/[id]
 *
 * Full asset detail view. Resolves live status from the domain entity
 * (if linked via refType/refId) and includes related data where available.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const asset = await prisma.cityAsset.findUnique({
      where: { id: params.id },
    });

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    // Resolve zone name
    const zone = asset.zoneId
      ? await prisma.zone.findUnique({ where: { id: asset.zoneId }, select: { id: true, name: true } })
      : null;

    // Build the live detail object
    const detail: Record<string, any> = {
      ...asset,
      zoneName: zone?.name ?? null,
      liveData: null,
      relatedIncidents: [],
    };

    // ── Resolve live data from domain entity ─────────────────────────────
    if (asset.refType && asset.refId) {
      switch (asset.refType) {
        case "CCTVFeed": {
          const feed = await prisma.cCTVFeed.findUnique({
            where: { id: asset.refId },
            include: { junction: { include: { zone: true } } },
          });
          if (feed) {
            detail.status = feed.status === "online" ? "HEALTHY" : "OFFLINE";
            detail.healthScore = feed.status === "online" ? 95 : 10;
            detail.lastSeenAt = new Date().toISOString();
            detail.liveData = {
              type: "cctv",
              feedStatus: feed.status,
              lastEvent: feed.lastEvent,
              junctionName: feed.junction.name,
              zoneName: feed.junction.zone?.name,
            };
          }
          break;
        }
        case "WaterSensor": {
          const sensor = await prisma.waterSensor.findUnique({
            where: { id: asset.refId },
            include: {
              zone: true,
              readings: { orderBy: { timestamp: "desc" }, take: 24, select: { waterLevel: true, timestamp: true } },
            },
          });
          if (sensor) {
            const level = sensor.waterLevel;
            const riskLevel = level >= 160 ? "danger" : level >= 120 ? "warning" : level >= 80 ? "watch" : "normal";
            detail.status = level > 160 ? "OFFLINE" : level > 120 ? "DEGRADED" : "HEALTHY";
            detail.healthScore = Math.max(10, 100 - Math.round(level / 2));
            detail.lastSeenAt = sensor.timestamp.toISOString();
            detail.liveData = {
              type: "water_sensor",
              waterLevelCm: level,
              riskLevel,
              history: sensor.readings.map(r => ({
                timestamp: r.timestamp.toISOString(),
                waterLevelCm: r.waterLevel,
              })),
              thresholds: { watch: 80, warning: 120, danger: 160 },
            };
          }
          break;
        }
        case "Junction": {
          const junction = await prisma.junction.findUnique({
            where: { id: asset.refId },
            include: {
              zone: true,
              trafficReadings: { orderBy: { timestamp: "desc" }, take: 12, select: { vehiclesPerHour: true, avgSpeed: true, congestionLevel: true, timestamp: true } },
              cctvFeeds: { select: { id: true, status: true } },
              signalOverride: true,
            },
          });
          if (junction) {
            const latest = junction.trafficReadings[0];
            const cong = latest?.congestionLevel ?? 0;
            detail.status = cong > 0.85 ? "DEGRADED" : "HEALTHY";
            detail.healthScore = Math.max(10, 100 - Math.round(cong * 100));
            detail.lastSeenAt = latest?.timestamp?.toISOString() ?? null;
            detail.liveData = {
              type: "junction",
              congestionLevel: cong,
              vehiclesPerHour: latest?.vehiclesPerHour ?? 0,
              avgSpeedKph: latest?.avgSpeed ?? 0,
              cameraCount: junction.cctvFeeds.length,
              camerasOnline: junction.cctvFeeds.filter(c => c.status === "online").length,
              signalOverride: junction.signalOverride ? {
                greenDuration: junction.signalOverride.greenDuration,
                redDuration: junction.signalOverride.redDuration,
                reason: junction.signalOverride.reason,
                expiresAt: junction.signalOverride.expiresAt?.toISOString(),
              } : null,
              history: junction.trafficReadings.map(r => ({
                timestamp: r.timestamp.toISOString(),
                congestionLevel: r.congestionLevel,
                vehiclesPerHour: r.vehiclesPerHour,
                avgSpeedKph: r.avgSpeed,
              })),
            };
          }
          break;
        }
        case "EmergencyUnit": {
          const unit = await prisma.emergencyUnit.findUnique({
            where: { id: asset.refId },
            include: {
              incidents: {
                orderBy: { reportedAt: "desc" },
                take: 5,
                select: { id: true, type: true, status: true, severity: true, reportedAt: true },
              },
            },
          });
          if (unit) {
            detail.status = unit.isAvailable ? "HEALTHY" : "DEGRADED";
            detail.healthScore = unit.isAvailable ? 90 : 55;
            detail.lastSeenAt = new Date().toISOString();
            detail.liveData = {
              type: "emergency_unit",
              unitType: unit.type,
              isAvailable: unit.isAvailable,
              recentIncidents: unit.incidents,
            };
          }
          break;
        }
        case "EnvironmentSensor": {
          const sensor = await prisma.environmentSensor.findUnique({
            where: { id: asset.refId }
          });
          if (sensor) {
            detail.status = asset.status === "HEALTHY" ? (sensor.aqi > 150 ? "DEGRADED" : "HEALTHY") : asset.status;
            detail.healthScore = asset.status === "HEALTHY" ? Math.max(60, 100 - Math.round(sensor.aqi / 3)) : 10;
            detail.lastSeenAt = sensor.updatedAt.toISOString();
            detail.liveData = {
              type: "env_sensor",
              aqi: sensor.aqi,
              pm25: sensor.pm25,
              temperature: sensor.temperature,
              humidity: sensor.humidity,
              sensorStatus: asset.status,
            };
          }
          break;
        }
        case "GarbageBin": {
          const bin = await prisma.garbageBin.findUnique({
            where: { id: asset.refId },
            include: { Zone: true, assignedVehicle: true },
          });
          if (bin) {
            detail.status = bin.status === "offline" ? "OFFLINE" : bin.status === "overflowing" ? "DEGRADED" : "HEALTHY";
            detail.healthScore = detail.status === "HEALTHY" ? Math.max(50, 100 - bin.fillPercentage) : detail.status === "DEGRADED" ? 30 : 5;
            detail.lastSeenAt = bin.updatedAt.toISOString();
            detail.liveData = {
              type: "garbage_bin",
              fillPercentage: bin.fillPercentage,
              lastCollected: bin.lastCollected.toISOString(),
              binStatus: bin.status,
              fillRate: bin.fillRate,
              predictedOverflow: bin.predictedOverflow?.toISOString() ?? null,
              priorityScore: bin.priorityScore,
              assignedVehicle: bin.assignedVehicle?.assetCode ?? null,
            };
          }
          break;
        }
        case "WasteVehicle": {
          const vehicle = await prisma.wasteVehicle.findUnique({
             where: { id: asset.refId },
             include: { routes: { where: { status: { in: ["ASSIGNED", "IN_PROGRESS"] } }, include: { stops: true } } }
          });
          if (vehicle) {
            detail.status = vehicle.status === "OFFLINE" ? "OFFLINE" : "HEALTHY";
            detail.healthScore = 100;
            detail.lastSeenAt = vehicle.updatedAt.toISOString();
            detail.liveData = {
              type: "waste_vehicle",
              vehicleStatus: vehicle.status,
              capacity: vehicle.capacity,
              currentLoad: vehicle.currentLoad,
              activeRouteStops: vehicle.routes[0]?.stops?.length ?? 0
            };
          }
          break;
        }
        case "StreetLight": {
          const light = await prisma.streetLight.findUnique({
            where: { id: asset.refId },
            include: { Zone: true },
          });
          if (light) {
            detail.status = light.status === "offline" ? "OFFLINE" : light.status === "fault" ? "DEGRADED" : "HEALTHY";
            detail.healthScore = detail.status === "HEALTHY" ? 90 : detail.status === "DEGRADED" ? 45 : 5;
            detail.lastSeenAt = light.updatedAt.toISOString();
            detail.liveData = {
              type: "street_light",
              powerConsumption: light.powerConsumption,
              dimmingLevel: light.dimmingLevel,
              lightStatus: light.status,
            };
          }
          break;
        }
        case "PublicVehicle": {
          const vehicle = await prisma.publicVehicle.findUnique({ where: { id: asset.refId } });
          if (vehicle) {
            detail.status = vehicle.status === "offline" ? "OFFLINE" : vehicle.status === "delayed" ? "DEGRADED" : "HEALTHY";
            detail.healthScore = detail.status === "HEALTHY" ? 85 : detail.status === "DEGRADED" ? 50 : 10;
            detail.lastSeenAt = vehicle.updatedAt.toISOString();
            detail.liveData = {
              type: "public_vehicle",
              routeId: vehicle.routeId,
              speed: vehicle.speed,
              occupancy: vehicle.occupancy,
              vehicleStatus: vehicle.status,
              currentLat: vehicle.lat,
              currentLng: vehicle.lng,
            };
          }
          break;
        }
        case "EnergyAsset": {
          const energy = await prisma.energyAsset.findUnique({
            where: { id: asset.refId },
            include: { streetlights: true, dependentAssets: true }
          });
          if (energy) {
            detail.status = energy.status === "NORMAL" ? "HEALTHY" : energy.status === "FAULT" || energy.status === "OFFLINE" ? "OFFLINE" : "DEGRADED";
            detail.healthScore = detail.status === "HEALTHY" ? 100 : detail.status === "DEGRADED" ? 70 : 10;
            detail.lastSeenAt = energy.updatedAt.toISOString();
            detail.liveData = {
              type: "energy_asset",
              energyType: energy.type,
              currentLoad: energy.currentLoad,
              capacity: energy.capacity,
              powerState: energy.powerState,
              assetStatus: energy.status,
              dependentStreetlights: energy.streetlights.length,
              dependentAssets: energy.dependentAssets.length,
            };
          }
          break;
        }
      }
    }

    // ── Fetch related active incidents near this asset ────────────────────
    const NEARBY_KM = 0.5;
    const LAT_DELTA = NEARBY_KM / 111.0;
    const LNG_DELTA = NEARBY_KM / (111.0 * Math.cos((asset.lat * Math.PI) / 180));

    const relatedIncidents = await prisma.incident.findMany({
      where: {
        lat: { gte: asset.lat - LAT_DELTA, lte: asset.lat + LAT_DELTA },
        lng: { gte: asset.lng - LNG_DELTA, lte: asset.lng + LNG_DELTA },
        status: { not: "resolved" },
      },
      orderBy: { reportedAt: "desc" },
      take: 5,
      select: { id: true, type: true, severity: true, status: true, reportedAt: true, description: true },
    });

    detail.relatedIncidents = relatedIncidents;

    return NextResponse.json(detail);
  } catch (err) {
    console.error("[api/assets/[id]] error:", err);
    return NextResponse.json({ error: "Failed to load asset" }, { status: 500 });
  }
}
