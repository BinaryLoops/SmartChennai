import { TelemetryContext, TelemetryGenerator } from "./types";
import { TelemetryReading } from "../../packages/types";
import { emitEventTransition } from "../event_fabric";

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // in km
}

function getHeading(lat1: number, lon1: number, lat2: number, lon2: number) {
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const l1 = lat1 * (Math.PI / 180);
  const l2 = lat2 * (Math.PI / 180);
  const y = Math.sin(dLon) * Math.cos(l2);
  const x = Math.cos(l1) * Math.sin(l2) - Math.sin(l1) * Math.cos(l2) * Math.cos(dLon);
  return (Math.atan2(y, x) * (180 / Math.PI) + 360) % 360;
}

// Find closest segment and distance along polyline. We assume buses don't reverse.
function advanceVehicle(lat: number, lng: number, polyline: number[][], distanceKm: number) {
  if (polyline.length < 2) return { lat, lng, heading: 0, reachedEnd: true };
  
  // Find nearest segment
  let minD = Infinity;
  let bestIdx = 0;
  for (let i = 0; i < polyline.length - 1; i++) {
    const d1 = getDistance(lat, lng, polyline[i][0], polyline[i][1]);
    const d2 = getDistance(lat, lng, polyline[i+1][0], polyline[i+1][1]);
    if (d1 + d2 < minD) {
      minD = d1 + d2;
      bestIdx = i;
    }
  }

  // Move along segments
  let remaining = distanceKm;
  let curLat = lat;
  let curLng = lng;
  let heading = 0;
  let reachedEnd = false;

  for (let i = bestIdx; i < polyline.length - 1; i++) {
    const pNext = polyline[i+1];
    const distToNext = getDistance(curLat, curLng, pNext[0], pNext[1]);
    heading = getHeading(curLat, curLng, pNext[0], pNext[1]);
    
    if (remaining <= distToNext) {
      const ratio = remaining / distToNext;
      curLat = curLat + (pNext[0] - curLat) * ratio;
      curLng = curLng + (pNext[1] - curLng) * ratio;
      remaining = 0;
      break;
    } else {
      remaining -= distToNext;
      curLat = pNext[0];
      curLng = pNext[1];
    }
  }

  if (remaining > 0) reachedEnd = true;

  return { lat: curLat, lng: curLng, heading, reachedEnd };
}

export const transitGenerator: TelemetryGenerator = {
  name: "transit",
  runTick: async (ctx: TelemetryContext) => {
    const { prisma, io, simulatedHour, speedMultiplier, scenario, causalMods } = ctx;
    const readings: TelemetryReading[] = [];
    const shouldSample = Math.random() < 0.1;

    try {
      const vehicles = await prisma.transitVehicle.findMany({
        include: { route: { include: { stops: { include: { stop: true }, orderBy: { stopIndex: 'asc' } } } } }
      });

      let totalDelay = 0;
      let delayedCount = 0;
      let activeCount = 0;
      let overCapacityCount = 0;

      for (const v of vehicles) {
        if (!v.route || v.status === "OFFLINE" || v.status === "OUT_OF_SERVICE") continue;
        
        activeCount++;
        const route = v.route;
        const polyline = JSON.parse(route.polyline || "[]");
        
        let newStatus = v.status;
        let newLat = v.lat;
        let newLng = v.lng;
        let newHeading = v.heading;
        let newSpeed = v.speed;
        let newOccupancy = v.occupancy;
        let newDelay = v.delayMinutes;
        
        // 1. Determine demand and traffic modifiers
        let trafficModifier = 1.0;
        let demandModifier = 1.0;
        
        // Morning peak 8-10, Evening peak 17-20
        if (simulatedHour >= 8 && simulatedHour <= 10) { demandModifier = 1.8; trafficModifier = 0.6; }
        else if (simulatedHour >= 17 && simulatedHour <= 20) { demandModifier = 2.0; trafficModifier = 0.5; }
        else if (simulatedHour < 5) { demandModifier = 0.2; trafficModifier = 1.2; }
        
        if (scenario === "EXTREME_HEAT") demandModifier *= 1.2;
        if (scenario === "HEAVY_RAIN") trafficModifier *= 0.7;
        if (causalMods?.trafficFriction) trafficModifier *= (1 - Math.min(0.9, causalMods.trafficFriction));

        const baseSpeedKph = 35; 
        const targetSpeed = baseSpeedKph * trafficModifier * (0.8 + Math.random() * 0.4);

        if (newStatus === "BOARDING") {
          newSpeed = 0;
          // Dwell time mock: randomly finish boarding if we were boarding
          if (Math.random() * speedMultiplier > 0.3) {
            newStatus = "MOVING";
            // Update occupancy based on demand
            const boarding = Math.floor(Math.random() * 10 * demandModifier);
            const alighting = Math.floor(Math.random() * 8);
            newOccupancy = Math.max(0, Math.min(v.capacity * 1.5, newOccupancy + boarding - alighting)); // Allow over-capacity
            
            // Advance next stop
            if (v.nextStopId) {
              const currentIdx = route.stops.findIndex(s => s.stop.stopCode === v.nextStopId);
              if (currentIdx >= 0 && currentIdx < route.stops.length - 1) {
                newStatus = "MOVING";
              } else {
                newStatus = "STOPPED"; // End of line
              }
            }
          }
        } else if (newStatus === "MOVING") {
          // Adjust speed
          newSpeed = newSpeed + (targetSpeed - newSpeed) * 0.2;
          
          // Advance vehicle
          // speed is km/h. tick is ~5 seconds in real time, but speedMultiplier alters it.
          // distance = speed * (time_delta_in_hours) * multiplier
          const hoursPassed = (5 / 3600) * speedMultiplier;
          const distToMove = newSpeed * hoursPassed;
          
          const adv = advanceVehicle(newLat, newLng, polyline, distToMove);
          newLat = adv.lat;
          newLng = adv.lng;
          newHeading = adv.heading;
          
          // Check if reached next stop
          if (v.nextStopId) {
            const nextStopObj = route.stops.find(s => s.stop.stopCode === v.nextStopId)?.stop;
            if (nextStopObj) {
              const distToStop = getDistance(newLat, newLng, nextStopObj.lat, nextStopObj.lng);
              if (distToStop < 0.1) { // within 100m
                newStatus = "BOARDING";
                newLat = nextStopObj.lat;
                newLng = nextStopObj.lng;
                
                // Advance next stop pointer
                const currentIdx = route.stops.findIndex(s => s.stopId === nextStopObj.id);
                const actualNext = route.stops[currentIdx + 1];
                if (actualNext) {
                   await prisma.transitVehicle.update({ where: { id: v.id }, data: { nextStopId: actualNext.stop.stopCode }});
                } else {
                   // Loop route back to start
                   await prisma.transitVehicle.update({ where: { id: v.id }, data: { nextStopId: route.stops[0].stop.stopCode }});
                }
              }
            }
          }

          // Delay calculation (simple model: if speed < 20 for a while, increase delay)
          if (newSpeed < 15) newDelay += 1;
          else if (newSpeed > 30 && newDelay > 0) newDelay -= 1;
        } else if (newStatus === "STOPPED") {
          // Restart route
          newStatus = "MOVING";
          newOccupancy = 0;
          newDelay = 0;
        }

        await prisma.transitVehicle.update({
          where: { id: v.id },
          data: { lat: newLat, lng: newLng, heading: newHeading, speed: newSpeed, occupancy: newOccupancy, delayMinutes: newDelay, status: newStatus, lastSeen: new Date() }
        });
        
        totalDelay += newDelay;
        if (newDelay > 10) delayedCount++;
        if (newOccupancy > v.capacity) overCapacityCount++;

        // Event Generation
        if (newOccupancy > v.capacity * 1.1) {
          await emitEventTransition(prisma, io, {
            type: "TRANSIT", severity: "HIGH", description: `Bus ${v.vehicleCode} on ${route.name} is severely overcrowded (${newOccupancy}/${v.capacity})`,
            assetId: v.id, metadata: { lat: newLat, lng: newLng, occupancy: newOccupancy }
          });
        }
        if (newDelay > 15) {
          await emitEventTransition(prisma, io, {
            type: "TRANSIT", severity: "HIGH", description: `Major delay on ${route.name} (Bus ${v.vehicleCode}: +${newDelay}m)`,
            assetId: v.id, metadata: { lat: newLat, lng: newLng, delay: newDelay }
          });
        } else if (newDelay === 0 && v.delayMinutes > 15) {
          await emitEventTransition(prisma, io, {
            type: "TRANSIT", severity: "NORMAL", description: `Service restored on ${route.name} (Bus ${v.vehicleCode})`,
            assetId: v.id, metadata: { lat: newLat, lng: newLng }
          });
        }
        
        if (shouldSample) {
          readings.push({ id: `tr-${Date.now()}-${v.id}`, assetId: v.id, metric: "transit_delay", value: newDelay, unit: "min", timestamp: new Date().toISOString(), quality: "LIVE", source: "sensor" });
          readings.push({ id: `tr-${Date.now()}-occ-${v.id}`, assetId: v.id, metric: "transit_occupancy", value: newOccupancy, unit: "pax", timestamp: new Date().toISOString(), quality: "LIVE", source: "sensor" });
        }
      }

      const avgDelay = activeCount > 0 ? totalDelay / activeCount : 0;
      let health = 100;
      if (avgDelay > 10) health -= 20;
      if (delayedCount > activeCount * 0.3) health -= 20;
      if (overCapacityCount > 0) health -= 10;

      return { readings, healthScore: Math.max(0, health) };
    } catch (e) {
      console.error("[transitGenerator] error:", e);
      return { readings: [], healthScore: 100 };
    }
  }
};
