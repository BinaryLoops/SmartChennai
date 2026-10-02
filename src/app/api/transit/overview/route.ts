import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const vehicles = await prisma.transitVehicle.findMany();
    const activeVehicles = vehicles.filter((v) => v.status !== "OFFLINE" && v.status !== "OUT_OF_SERVICE");
    const delayedVehicles = activeVehicles.filter((v) => v.delayMinutes > 5);
    const overCapacity = activeVehicles.filter((v) => v.occupancy > v.capacity);
    const totalPassengers = activeVehicles.reduce((acc, v) => acc + v.occupancy, 0);
    const totalDelay = delayedVehicles.reduce((acc, v) => acc + v.delayMinutes, 0);

    const activeCount = activeVehicles.length;
    const avgDelay = delayedVehicles.length > 0 ? totalDelay / delayedVehicles.length : 0;
    
    // Service Reliability is a simple proxy
    const onTimeCount = activeCount - delayedVehicles.length;
    const serviceReliability = activeCount > 0 ? Math.round((onTimeCount / activeCount) * 100) : 100;

    return NextResponse.json({
      activeVehicles: activeCount,
      delayedVehicles: delayedVehicles.length,
      averageDelay: Math.round(avgDelay),
      overCapacityVehicles: overCapacity.length,
      passengersInNetwork: totalPassengers,
      serviceReliability,
      vehicles: activeVehicles.map(v => ({
        id: v.id,
        vehicleCode: v.vehicleCode,
        status: v.status,
        delayMinutes: v.delayMinutes,
        occupancy: v.occupancy,
        capacity: v.capacity
      }))
    });
  } catch (error) {
    console.error("Transit overview fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch transit overview" }, { status: 500 });
  }
}
