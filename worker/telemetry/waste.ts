import { TelemetryContext, TelemetryGenerator } from "./types";
import { TelemetryReading } from "../../packages/types";
import { emitEventTransition } from "../event_fabric";

export const wasteGenerator: TelemetryGenerator = {
  name: "waste",
  runTick: async (ctx: TelemetryContext) => {
    const { prisma, io, speedMultiplier, scenario } = ctx;
    const readings: TelemetryReading[] = [];
    const shouldSample = Math.random() < 0.1;

    try {
      // 1. Process Vehicle Movements & Collections
      const activeRoutes = await prisma.wasteRoute.findMany({
        where: { status: { in: ["ASSIGNED", "IN_PROGRESS"] } },
        include: { stops: { include: { bin: true } }, vehicle: true }
      });

      for (const route of activeRoutes) {
        if (route.status === "ASSIGNED") {
          await prisma.wasteRoute.update({ where: { id: route.id }, data: { status: "IN_PROGRESS", startTime: new Date() } });
          await prisma.wasteVehicle.update({ where: { id: route.vehicleId }, data: { status: "EN_ROUTE" } });
        }

        const pendingStops = route.stops.filter(s => s.status !== "COLLECTED").sort((a, b) => a.order - b.order);
        if (pendingStops.length > 0) {
          const currentStop = pendingStops[0];
          
          if (currentStop.status === "PENDING") {
             // Move vehicle closer (mock progress)
             await prisma.wasteRouteStop.update({ where: { id: currentStop.id }, data: { status: "ARRIVED", eta: new Date() } });
             await prisma.wasteVehicle.update({ where: { id: route.vehicleId }, data: { status: "COLLECTING", lat: currentStop.bin!.lat, lng: currentStop.bin!.lng } });
          } else if (currentStop.status === "ARRIVED" || currentStop.status === "COLLECTING") {
             // Perform collection
             const bin = currentStop.bin!;
             let newFill = Math.max(0, bin.fillPercentage - (25 * speedMultiplier));
             if (newFill <= 0) {
                newFill = 0;
                await prisma.wasteRouteStop.update({ where: { id: currentStop.id }, data: { status: "COLLECTED", completedAt: new Date() } });
                await prisma.garbageBin.update({ where: { id: bin.id }, data: { fillPercentage: 0, status: "ok", assignedVehicleId: null, lastCollected: new Date() } });
                
                await emitEventTransition(prisma, io, {
                  type: "WASTE", severity: "NORMAL",
                  description: `Garbage bin ${bin.id.slice(0, 6)} has been collected`,
                  zoneId: bin.zoneId, source: "sensor", confidence: 0.99
                });
             } else {
                await prisma.garbageBin.update({ where: { id: bin.id }, data: { fillPercentage: Math.round(newFill) } });
             }
          }
        } else {
          // Route completed
          await prisma.wasteRoute.update({ where: { id: route.id }, data: { status: "COMPLETED", completionTime: new Date() } });
          await prisma.wasteVehicle.update({ where: { id: route.vehicleId }, data: { status: "AVAILABLE" } });
        }
      }

      // 2. Process Bins Stateful Increment
      const bins = await prisma.garbageBin.findMany();
      let totalFill = 0;

      for (const bin of bins) {
        if (bin.assignedVehicleId) {
          totalFill += bin.fillPercentage;
          continue; // skip incrementing if being collected
        }

        let currentRate = bin.fillRate * (speedMultiplier / 60); // rate per minute scaled to tick
        if (ctx.causalMods?.wasteGenerationMultiplier) {
          currentRate *= (1 + ctx.causalMods.wasteGenerationMultiplier);
        }

        let newFill = Math.min(100, bin.fillPercentage + currentRate);
        let status = newFill > 95 ? "overflowing" : "ok";
        
        let priorityScore = 0;
        let predictedOverflow = null;
        if (currentRate > 0) {
           const minsToOverflow = (100 - newFill) / currentRate;
           predictedOverflow = new Date(Date.now() + minsToOverflow * 60000);
        }

        if (newFill >= 90) priorityScore = 90;
        else if (newFill >= 75) priorityScore = 60;
        else priorityScore = 10;

        await prisma.garbageBin.update({
          where: { id: bin.id },
          data: { 
            fillPercentage: Math.round(newFill), 
            status,
            predictedOverflow,
            priorityScore,
            updatedAt: new Date() 
          }
        });

        const timestamp = new Date().toISOString();
        readings.push({
          id: `waste-${bin.id}-${Date.now()}`,
          assetId: bin.id,
          metric: "fillPercentage",
          value: Math.round(newFill),
          unit: "%",
          timestamp,
          quality: "LIVE",
          source: "sensor",
        });

        // 3. Dispatch Rules
        if (priorityScore >= 60 && !bin.assignedVehicleId) {
           const availableVehicle = await prisma.wasteVehicle.findFirst({ where: { status: "AVAILABLE" }});
           if (availableVehicle) {
              const route = await prisma.wasteRoute.create({
                 data: {
                    vehicleId: availableVehicle.id,
                    status: "ASSIGNED",
                    slaDeadline: new Date(Date.now() + 2 * 60 * 60 * 1000)
                 }
              });
              await prisma.wasteRouteStop.create({
                 data: {
                    routeId: route.id,
                    binId: bin.id,
                    order: 1,
                    status: "PENDING"
                 }
              });
              await prisma.garbageBin.update({ where: { id: bin.id }, data: { assignedVehicleId: availableVehicle.id }});
              await prisma.wasteVehicle.update({ where: { id: availableVehicle.id }, data: { status: "EN_ROUTE" }});
              
              await emitEventTransition(prisma, io, {
                type: "WASTE", severity: newFill >= 95 ? "CRITICAL" : "HIGH",
                description: `Vehicle ${availableVehicle.assetCode} dispatched to bin ${bin.id.slice(0, 6)} (${Math.round(newFill)}%)`,
                zoneId: bin.zoneId, source: "department", confidence: 0.99
              });
           } else if (newFill > 95 && bin.fillPercentage <= 95) {
              await emitEventTransition(prisma, io, {
                type: "WASTE", severity: "CRITICAL",
                description: `Garbage bin ${bin.id.slice(0, 6)} is overflowing (No vehicles available)`,
                zoneId: bin.zoneId, source: "sensor", confidence: 0.99
              });
           }
        }
        
        totalFill += newFill;

        if (shouldSample) {
          const asset = await prisma.cityAsset.findFirst({ where: { refId: bin.id, refType: "GarbageBin" }});
          if (asset) {
            await prisma.telemetrySample.create({
              data: { assetId: asset.id, metric: "fillPercentage", value: Math.round(newFill), unit: "%" }
            });
          }
        }
      }

      const avgFill = bins.length > 0 ? totalFill / bins.length : 0;
      return { readings, healthScore: Math.round(100 - avgFill) };
    } catch (err) {
      console.error("[telemetry:waste] generator failed:", err);
      return { readings: [], healthScore: null };
    }
  }
};
