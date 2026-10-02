import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const facilities = await prisma.healthcareFacility.findMany();
    const ambulances = await prisma.emergencyUnit.findMany({
      where: { type: "ambulance" }
    });

    const operationalFacilities = facilities.filter(f => f.status === "OPERATIONAL").length;
    const facilitiesUnderPressure = facilities.filter(f => f.status === "BUSY" || f.status === "OVER_CAPACITY" || f.status === "CRITICAL").length;

    const totalEmergencyBeds = facilities.reduce((sum, f) => sum + f.emergencyBeds, 0);
    const occupiedEmergencyBeds = facilities.reduce((sum, f) => sum + f.occupiedEmergencyBeds, 0);
    
    const totalIcuBeds = facilities.reduce((sum, f) => sum + f.icuBeds, 0);
    const occupiedIcuBeds = facilities.reduce((sum, f) => sum + f.occupiedIcuBeds, 0);

    const availableAmbulances = ambulances.filter(a => a.status === "AVAILABLE").length;
    const enRouteAmbulances = ambulances.filter(a => a.status === "EN_ROUTE" || a.status === "TRANSPORTING").length;

    const avgWaitTime = facilities.length > 0 
      ? Math.round(facilities.reduce((sum, f) => sum + f.waitTimeMinutes, 0) / facilities.length) 
      : 0;

    return NextResponse.json({
      operationalFacilities,
      facilitiesUnderPressure,
      totalEmergencyBeds,
      occupiedEmergencyBeds,
      totalIcuBeds,
      occupiedIcuBeds,
      icuAvailabilityPct: totalIcuBeds > 0 ? Math.round(((totalIcuBeds - occupiedIcuBeds) / totalIcuBeds) * 100) : 0,
      emergencyOccupancyPct: totalEmergencyBeds > 0 ? Math.round((occupiedEmergencyBeds / totalEmergencyBeds) * 100) : 0,
      availableAmbulances,
      enRouteAmbulances,
      avgWaitTime
    });
  } catch (error) {
    console.error("[GET /api/healthcare/overview] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
