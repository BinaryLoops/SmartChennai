import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const facilities = await prisma.healthcareFacility.findMany({
      include: {
        inboundAmbulances: true
      }
    });
    const ambulances = await prisma.emergencyUnit.findMany({
      where: { type: "ambulance" }
    });

    return NextResponse.json({
      facilities,
      ambulances
    });
  } catch (error) {
    console.error("[GET /api/healthcare/facilities] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
