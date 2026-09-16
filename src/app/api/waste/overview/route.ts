import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const bins = await prisma.garbageBin.findMany({
      include: { Zone: true, assignedVehicle: true },
    });

    const routes = await prisma.wasteRoute.findMany({
      where: { status: { in: ["ASSIGNED", "IN_PROGRESS", "COMPLETED"] } },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { stops: { include: { bin: true } }, vehicle: true }
    });

    const totalBins = bins.length;
    const overflowingBins = bins.filter(b => b.status === "overflowing" || b.fillPercentage >= 95).length;
    const nearCapacityBins = bins.filter(b => b.fillPercentage >= 80 && b.fillPercentage < 95).length;
    const avgFill = totalBins > 0 ? bins.reduce((acc, b) => acc + b.fillPercentage, 0) / totalBins : 0;

    // Calculate SLA KPI (from COMPLETED routes that finished before slaDeadline)
    const completedRoutes = routes.filter(r => r.status === "COMPLETED");
    const onTimeRoutes = completedRoutes.filter(r => r.completionTime && r.slaDeadline && r.completionTime <= r.slaDeadline).length;
    const slasMet = completedRoutes.length > 0 ? (onTimeRoutes / completedRoutes.length) * 100 : 100;

    return NextResponse.json({
      metrics: {
        totalBins,
        overflowingBins,
        nearCapacityBins,
        avgFill: Math.round(avgFill),
        slasMet: Math.round(slasMet)
      },
      bins: bins.map(b => ({
        id: b.id,
        lat: b.lat,
        lng: b.lng,
        fillPercentage: b.fillPercentage,
        status: b.status,
        predictedOverflow: b.predictedOverflow?.toISOString() ?? null,
        priorityScore: b.priorityScore,
        assignedVehicle: b.assignedVehicle?.assetCode ?? null,
        zoneName: b.Zone.name
      })),
      activeRoutes: routes.filter(r => r.status !== "COMPLETED").map(r => ({
        id: r.id,
        vehicleCode: r.vehicle.assetCode,
        status: r.status,
        lat: r.vehicle.lat,
        lng: r.vehicle.lng,
        stops: r.stops.map(s => ({
           id: s.id,
           lat: s.bin?.lat,
           lng: s.bin?.lng,
           status: s.status
        }))
      }))
    });
  } catch (error) {
    console.error("[api/waste/overview]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
