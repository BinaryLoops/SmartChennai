import { PrismaClient } from "@prisma/client";
import { TelemetryContext } from "./types";
import { Server } from "socket.io";
import { emitEventTransition } from "../event_fabric";

const prisma = new PrismaClient();

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const publicWorksGenerator = {
  async runTick(context: TelemetryContext, io: Server) {
    try {
      // 1. PROJECT PROGRESS SIMULATION
      const projects = await prisma.infrastructureProject.findMany({
        where: { status: { in: ['IN_PROGRESS', 'AT_RISK', 'DELAYED'] } }
      });

      for (const project of projects) {
        const progressIncrement = 0.05 + Math.random() * 0.15;
        let newProgress = project.progressPercent + progressIncrement;
        if (newProgress >= 100) newProgress = 100;

        let status = project.status;
        
        const totalDays = (project.plannedEndDate!.getTime() - project.startDate!.getTime()) / (1000 * 3600 * 24);
        const elapsedDays = (Date.now() - project.startDate!.getTime()) / (1000 * 3600 * 24);
        const expectedProgress = (elapsedDays / totalDays) * 100;
        const variance = newProgress - expectedProgress;
        
        if (variance < -15) {
          status = 'DELAYED';
        } else if (variance < -5) {
          status = 'AT_RISK';
        } else {
          status = 'IN_PROGRESS';
        }

        if (newProgress >= 100) {
          status = 'COMPLETED';
        }

        const updatedProj = await prisma.infrastructureProject.update({
          where: { id: project.id },
          data: {
            progressPercent: newProgress,
            status,
            budgetSpent: project.budgetSpent + (project.budgetPlanned * (progressIncrement / 100)),
          }
        });

        io.emit("publicworks:project:update", updatedProj);
      }

      // 2. CROSS-SECTOR AUTOMATION (Work Orders from Events)
      const activeEvents = await prisma.cityEvent.findMany({
        where: {
          status: 'active',
          timestamp: { gte: new Date(Date.now() - 60000) }
        },
        include: { CityAsset: true }
      });

      for (const event of activeEvents) {
        let category = null;
        let specialization = null;
        if (event.type === 'POWER_OUTAGE' && event.CityAsset?.assetType === 'STREETLIGHT') {
          category = 'STREETLIGHT_FAILURE';
          specialization = 'ELECTRICAL';
        } else if (event.type === 'FLOOD' || (event.severity === 'CRITICAL' && event.description.toLowerCase().includes('drain'))) {
          category = 'DRAIN_BLOCKAGE';
          specialization = 'DRAINAGE';
        }

        if (category && event.assetId) {
          const existingWO = await prisma.workOrder.findFirst({
            where: {
              assetId: event.assetId,
              status: { in: ['OPEN', 'TRIAGED', 'ASSIGNED', 'EN_ROUTE', 'IN_PROGRESS', 'BLOCKED', 'VERIFICATION'] }
            }
          });

          if (!existingWO) {
            const wo = await prisma.workOrder.create({
              data: {
                assetId: event.assetId,
                zoneId: event.zoneId,
                category,
                priority: event.severity === 'CRITICAL' ? 'HIGH' : 'MEDIUM',
                status: 'OPEN',
                description: `Auto-generated from ${event.type}: ${event.description}`,
                slaDueAt: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours SLA
              }
            });
            await emitEventTransition(prisma, io, {
              type: 'WORK_ORDER_CREATED',
              description: `Work Order ${wo.workOrderCode} created for ${event.type}`,
              severity: 'MEDIUM',
              zoneId: wo.zoneId || undefined,
              source: 'Public Works Automation'
            });
            io.emit("publicworks:workorder:update", wo);
          }
        }
      }

      // 3. CREW DISPATCH & WORK ORDER LIFECYCLE
      const openWorkOrders = await prisma.workOrder.findMany({
        where: { status: { in: ['OPEN', 'ASSIGNED', 'EN_ROUTE', 'IN_PROGRESS', 'VERIFICATION'] } },
        include: { CityAsset: true, Crew: true }
      });

      const availableCrews = await prisma.maintenanceCrew.findMany({
        where: { status: 'AVAILABLE' }
      });

      for (const wo of openWorkOrders) {
        if (wo.status === 'OPEN') {
          let bestCrew = null;
          let bestDist = Infinity;
          const woLat = wo.CityAsset?.lat || 13.04;
          const woLng = wo.CityAsset?.lng || 80.24;

          let reqSpec = 'GENERAL';
          if (wo.category === 'STREETLIGHT_FAILURE') reqSpec = 'ELECTRICAL';
          if (wo.category === 'DRAIN_BLOCKAGE') reqSpec = 'DRAINAGE';
          if (wo.category === 'ROAD_DAMAGE') reqSpec = 'ROAD';

          for (const crew of availableCrews) {
            if (crew.status === 'AVAILABLE' && (crew.specialization === reqSpec || crew.specialization === 'GENERAL')) {
              const d = getDistance(woLat, woLng, crew.lat || 13.04, crew.lng || 80.24);
              if (d < bestDist) {
                bestDist = d;
                bestCrew = crew;
              }
            }
          }

          if (bestCrew) {
            bestCrew.status = 'ASSIGNED';
            await prisma.workOrder.update({
              where: { id: wo.id },
              data: {
                status: 'ASSIGNED',
                assignedCrewId: bestCrew.id,
                assignedAt: new Date(),
                resolutionNotes: `Assigned ${bestCrew.crewCode}. Distance: ${bestDist.toFixed(1)}km. Spec: ${bestCrew.specialization}.`
              }
            });
            await prisma.maintenanceCrew.update({
              where: { id: bestCrew.id },
              data: { status: 'ASSIGNED', currentWorkOrderId: wo.id }
            });
            io.emit("publicworks:crew:update", bestCrew);
          }
        } else if (wo.status === 'ASSIGNED') {
          await prisma.workOrder.update({ where: { id: wo.id }, data: { status: 'EN_ROUTE' } });
          await prisma.maintenanceCrew.update({ where: { id: wo.assignedCrewId! }, data: { status: 'EN_ROUTE' }});
        } else if (wo.status === 'EN_ROUTE') {
          if (wo.Crew && wo.CityAsset) {
            const crew = wo.Crew;
            const targetLat = wo.CityAsset.lat;
            const targetLng = wo.CityAsset.lng;
            const d = getDistance(crew.lat!, crew.lng!, targetLat, targetLng);
            
            if (d < 0.1) {
              await prisma.workOrder.update({ where: { id: wo.id }, data: { status: 'IN_PROGRESS', startedAt: new Date() } });
              await prisma.maintenanceCrew.update({ where: { id: crew.id }, data: { status: 'WORKING' }});
            } else {
              const step = 0.05;
              const ratio = Math.min(step / d, 1);
              const newLat = crew.lat! + (targetLat - crew.lat!) * ratio;
              const newLng = crew.lng! + (targetLng - crew.lng!) * ratio;
              const upCrew = await prisma.maintenanceCrew.update({
                where: { id: crew.id },
                data: { lat: newLat, lng: newLng }
              });
              io.emit("publicworks:crew:update", upCrew);
            }
          }
        } else if (wo.status === 'IN_PROGRESS') {
          if (Math.random() < 0.1) {
            await prisma.workOrder.update({ where: { id: wo.id }, data: { status: 'VERIFICATION' } });
          }
        } else if (wo.status === 'VERIFICATION') {
          const upWo = await prisma.workOrder.update({
            where: { id: wo.id },
            data: { status: 'COMPLETED', completedAt: new Date(), actualCompletion: new Date() }
          });
          const upCrew = await prisma.maintenanceCrew.update({
            where: { id: wo.assignedCrewId! },
            data: { status: 'AVAILABLE', currentWorkOrderId: null }
          });
          io.emit("publicworks:workorder:update", upWo);
          io.emit("publicworks:crew:update", upCrew);

          await emitEventTransition(prisma, io, {
            type: 'WORK_ORDER_COMPLETED',
            description: `Work Order ${wo.workOrderCode} completed.`,
            severity: 'INFO',
            zoneId: wo.zoneId || undefined,
            source: 'Public Works Automation'
          });
        }
        
        if (wo.status !== 'VERIFICATION') {
          const latestWO = await prisma.workOrder.findUnique({ where: { id: wo.id }, include: { Crew: true }});
          if (latestWO) io.emit("publicworks:workorder:update", latestWO);
        }
      }

    } catch (e) {
      console.error("PublicWorks telemetry error:", e);
    }
  }
};
