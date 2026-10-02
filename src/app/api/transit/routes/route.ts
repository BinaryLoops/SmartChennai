import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const routes = await prisma.transitRoute.findMany({
      include: {
        vehicles: {
          select: { id: true, lat: true, lng: true, heading: true, speed: true, status: true, delayMinutes: true, vehicleCode: true, occupancy: true }
        },
        stops: {
          include: { stop: true },
          orderBy: { stopIndex: 'asc' }
        }
      }
    });

    return NextResponse.json({ routes });
  } catch (error) {
    console.error("Transit routes fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch transit routes" }, { status: 500 });
  }
}
