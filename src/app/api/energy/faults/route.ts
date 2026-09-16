import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const assets = await prisma.energyAsset.findMany({
      where: {
        status: { in: ["FAULT", "OFFLINE"] }
      },
      include: {
        streetlights: true,
        dependentAssets: true
      }
    });

    const faults = assets.map(a => ({
      id: a.id,
      type: a.type,
      lat: a.lat,
      lng: a.lng,
      zoneId: a.zoneId,
      status: a.status,
      affectedStreetlights: a.streetlights.length,
      affectedAssets: a.dependentAssets.length,
      updatedAt: a.updatedAt
    }));

    return NextResponse.json(faults);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch energy faults" }, { status: 500 });
  }
}
