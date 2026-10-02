import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const workOrders = await prisma.workOrder.findMany({
      orderBy: { reportedAt: 'desc' },
      include: {
        CityAsset: true,
        Zone: true,
        Crew: true,
        Project: true
      },
      take: 100 // Limit for dashboard
    });

    return NextResponse.json(workOrders);
  } catch (error) {
    console.error("Error fetching work orders:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
