import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const vehicles = await prisma.wasteVehicle.findMany({
      include: {
        assignedBins: { select: { id: true, fillPercentage: true, Zone: { select: { name: true } } } },
        routes: { 
          where: { status: { in: ["ASSIGNED", "IN_PROGRESS"] } },
          include: { stops: { include: { bin: true } } }
        }
      }
    });

    return NextResponse.json({
      fleet: vehicles.map(v => ({
        id: v.id,
        assetCode: v.assetCode,
        status: v.status,
        lat: v.lat,
        lng: v.lng,
        capacity: v.capacity,
        currentLoad: v.currentLoad,
        activeRoute: v.routes[0] ? {
           id: v.routes[0].id,
           status: v.routes[0].status,
           stops: v.routes[0].stops.map(s => ({
              id: s.id,
              binId: s.binId,
              status: s.status,
              eta: s.eta?.toISOString() ?? null
           }))
        } : null
      }))
    });
  } catch (error) {
    console.error("[api/waste/fleet]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
