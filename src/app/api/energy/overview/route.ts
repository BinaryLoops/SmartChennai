import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const assets = await prisma.energyAsset.findMany();
    
    let totalLoad = 0;
    let faults = 0;
    let online = 0;
    
    for (const a of assets) {
      if (a.status === "FAULT" || a.status === "OFFLINE") {
        faults++;
      } else {
        online++;
        totalLoad += a.currentLoad;
      }
    }
    
    const avgLoad = online > 0 ? totalLoad / online : 0;
    
    // Grid stability (100 - faults penalty - load penalty)
    const gridStability = assets.length > 0 ? 
      Math.max(0, 100 - (faults / assets.length) * 100 - (avgLoad > 80 ? (avgLoad - 80) : 0)) : 100;

    return NextResponse.json({
      totalAssets: assets.length,
      onlineAssets: online,
      faults,
      averageLoad: Math.round(avgLoad),
      gridStability: Math.round(gridStability)
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch energy overview" }, { status: 500 });
  }
}
