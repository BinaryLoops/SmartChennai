import { PrismaClient, EmergencyUnit, HealthcareFacility, Incident } from "@prisma/client";
import { getHaversineDistance } from "../../src/lib/distance";
import { TelemetryContext, TelemetryGenerator } from "./types";
import { TelemetryReading } from "../../packages/types";
import { emitEventTransition } from "../event_fabric";

// Active routes cache to prevent hammering OSRM
const activeRoutes = new Map<string, {
  polyline: [number, number][]; // [lat, lng][]
  progressIndex: number;
  totalDistanceKm: number;
  lastUpdate: number;
}>();

export async function fetchOSRMRoute(startLat: number, startLng: number, endLat: number, endLng: number): Promise<[number, number][]> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`OSRM HTTP error: ${res.status}`);
    const data = await res.json();
    if (data.routes && data.routes[0] && data.routes[0].geometry) {
      // OSRM returns [lng, lat], we want [lat, lng]
      return data.routes[0].geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]]);
    }
  } catch (err) {
    console.error("[healthcare] OSRM fetch failed, falling back to straight line", err);
  }
  return [[startLat, startLng], [endLat, endLng]];
}

export const healthcareGenerator: TelemetryGenerator = {
  name: "healthcare",
  runTick: async (ctx: TelemetryContext) => {
    const { prisma, io, speedMultiplier, scenario, causalMods } = ctx;
    const readings: TelemetryReading[] = [];
    let healthScore = 100;

  // 1. Process Hospital Bed Occupancy
  const facilities = await prisma.healthcareFacility.findMany();
  
  for (const facility of facilities) {
    let newOccupancy = facility.occupiedBeds;
    let newErOccupancy = facility.occupiedEmergencyBeds;

    // Simulate discharges
    if (newOccupancy > 0 && Math.random() < 0.05) newOccupancy -= 1;
    if (newErOccupancy > 0 && Math.random() < 0.1) newErOccupancy -= 1;

    // Simulate natural arrivals (affected by causalMods e.g. disaster)
    const demandMultiplier = causalMods?.emergencyDemandMultiplier || 1.0;
    
    if (Math.random() < (0.02 * demandMultiplier)) {
      newOccupancy += 1;
    }
    if (Math.random() < (0.03 * demandMultiplier)) {
      newErOccupancy += 1;
    }

    newOccupancy = Math.min(newOccupancy, facility.totalBeds);
    newOccupancy = Math.max(newOccupancy, 0);
    newErOccupancy = Math.min(newErOccupancy, facility.emergencyBeds);
    newErOccupancy = Math.max(newErOccupancy, 0);

    // Determine status
    let status = "OPERATIONAL";
    const occupancyRate = newOccupancy / facility.totalBeds;
    if (occupancyRate > 0.95) status = "CRITICAL";
    else if (occupancyRate > 0.85) status = "OVER_CAPACITY";
    else if (occupancyRate > 0.70) status = "BUSY";

    if (
      newOccupancy !== facility.occupiedBeds || 
      newErOccupancy !== facility.occupiedEmergencyBeds ||
      status !== facility.status
    ) {
      await prisma.healthcareFacility.update({
        where: { id: facility.id },
        data: {
          occupiedBeds: newOccupancy,
          occupiedEmergencyBeds: newErOccupancy,
          status,
          waitTimeMinutes: Math.floor(occupancyRate * 120),
          lastSeen: new Date()
        }
      });
    }
  }

  // 2. Process Ambulance Dispatch & Movement
  const ambulances = await prisma.emergencyUnit.findMany({
    where: { type: "ambulance" },
    include: { destinationFacility: true }
  });

  const activeMedicalIncidents = await prisma.incident.findMany({
    where: { 
      type: "medical", 
      status: { not: "resolved" },
      unitId: null
    }
  });

  for (const amb of ambulances) {
    if (amb.status === "AVAILABLE" && activeMedicalIncidents.length > 0) {
      const incident = activeMedicalIncidents.pop()!;
      // Dispatch
      const route = await fetchOSRMRoute(amb.lat, amb.lng, incident.lat, incident.lng);
      activeRoutes.set(amb.id, { polyline: route, progressIndex: 0, totalDistanceKm: 0, lastUpdate: Date.now() });

      await prisma.emergencyUnit.update({
        where: { id: amb.id },
        data: {
          status: "EN_ROUTE",
          currentIncidentId: incident.id,
          lastSeen: new Date()
        }
      });
      await prisma.incident.update({
        where: { id: incident.id },
        data: {
          unitId: amb.id,
          dispatchedAt: new Date(),
          status: "dispatched" as any
        }
      });
      continue;
    }

    if (amb.status === "EN_ROUTE" || amb.status === "TRANSPORTING" || amb.status === "RETURNING") {
      const routeData = activeRoutes.get(amb.id);
      if (routeData) {
        // Move along polyline
        const trafficFriction = causalMods?.trafficFriction || 1.0;
        const speedKmH = 40 / trafficFriction;
        const tickDurationHours = (5 * 1) / 3600; // Assuming 5s simulation tick
        const distanceToMove = speedKmH * tickDurationHours;

        let moved = 0;
        let currentLat = amb.lat;
        let currentLng = amb.lng;
        let { progressIndex, polyline } = routeData;

        while (moved < distanceToMove && progressIndex < polyline.length - 1) {
          const nextPt = polyline[progressIndex + 1];
          const dist = getHaversineDistance(currentLat, currentLng, nextPt[0], nextPt[1]);
          
          if (moved + dist <= distanceToMove) {
            moved += dist;
            progressIndex++;
            currentLat = nextPt[0];
            currentLng = nextPt[1];
          } else {
            // Interpolate
            const ratio = (distanceToMove - moved) / dist;
            currentLat = currentLat + (nextPt[0] - currentLat) * ratio;
            currentLng = currentLng + (nextPt[1] - currentLng) * ratio;
            moved = distanceToMove;
          }
        }

        activeRoutes.set(amb.id, { ...routeData, progressIndex });

        if (progressIndex >= polyline.length - 1) {
          // Reached destination
          if (amb.status === "EN_ROUTE") {
            // Arrived at scene
            await prisma.emergencyUnit.update({
              where: { id: amb.id },
              data: { status: "AT_SCENE", lat: currentLat, lng: currentLng, lastSeen: new Date() }
            });
          } else if (amb.status === "TRANSPORTING") {
            // Arrived at hospital
            await prisma.emergencyUnit.update({
              where: { id: amb.id },
              data: { status: "AT_HOSPITAL", lat: currentLat, lng: currentLng, lastSeen: new Date() }
            });
            // Update hospital ER occupancy upon arrival
            if (amb.destinationFacilityId) {
               await prisma.healthcareFacility.update({
                  where: { id: amb.destinationFacilityId },
                  data: { occupiedEmergencyBeds: { increment: 1 } }
               });
            }
          } else if (amb.status === "RETURNING") {
            await prisma.emergencyUnit.update({
              where: { id: amb.id },
              data: { status: "AVAILABLE", lat: currentLat, lng: currentLng, lastSeen: new Date() }
            });
            activeRoutes.delete(amb.id);
          }
        } else {
          // Still moving
          await prisma.emergencyUnit.update({
            where: { id: amb.id },
            data: { lat: currentLat, lng: currentLng, lastSeen: new Date() }
          });
        }
      } else {
        // Fallback if route missing in cache
        if (amb.status === "EN_ROUTE" && amb.currentIncidentId) {
          const incident = await prisma.incident.findUnique({ where: { id: amb.currentIncidentId } });
          if (incident) {
            const r = await fetchOSRMRoute(amb.lat, amb.lng, incident.lat, incident.lng);
            activeRoutes.set(amb.id, { polyline: r, progressIndex: 0, totalDistanceKm: 0, lastUpdate: Date.now() });
          }
        }
      }
    }

    if (amb.status === "AT_SCENE") {
      // Spend some time at scene, then transport
      if (Math.random() < 0.2) {
        // Find best hospital
        let bestHosp = null;
        let minScore = Infinity;
        for (const f of facilities) {
          if (f.status === "OFFLINE" || f.status === "CRITICAL") continue;
          const dist = getHaversineDistance(amb.lat, amb.lng, f.lat, f.lng);
          const erLoad = f.occupiedEmergencyBeds / f.emergencyBeds;
          // Score = distance + load penalty
          const score = dist + (erLoad * 10); 
          if (score < minScore) {
            minScore = score;
            bestHosp = f;
          }
        }

        if (bestHosp) {
          const route = await fetchOSRMRoute(amb.lat, amb.lng, bestHosp.lat, bestHosp.lng);
          activeRoutes.set(amb.id, { polyline: route, progressIndex: 0, totalDistanceKm: 0, lastUpdate: Date.now() });
          
          await prisma.emergencyUnit.update({
            where: { id: amb.id },
            data: {
              status: "TRANSPORTING",
              destinationFacilityId: bestHosp.id,
              lastSeen: new Date()
            }
          });
        }
      }
    }

    if (amb.status === "AT_HOSPITAL") {
      // Drop off patient, become available or return
      if (Math.random() < 0.3) {
        if (amb.currentIncidentId) {
          await prisma.incident.update({
            where: { id: amb.currentIncidentId },
            data: { status: "resolved", resolvedAt: new Date() }
          });
        }
        await prisma.emergencyUnit.update({
          where: { id: amb.id },
          data: {
            status: "AVAILABLE",
            destinationFacilityId: null,
            currentIncidentId: null,
            lastSeen: new Date()
          }
        });
      }
    }
  }

  // Calculate healthcare healthScore
  const totalBeds = facilities.reduce((sum, f) => sum + f.totalBeds, 0) || 1;
  const occupied = facilities.reduce((sum, f) => sum + f.occupiedBeds, 0);
  healthScore = 100 - ((occupied / totalBeds) * 100);

  return { readings, healthScore: Math.max(0, healthScore) };
  }
};
