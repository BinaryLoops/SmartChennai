import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const crews = await prisma.maintenanceCrew.findMany({
      orderBy: { status: 'asc' },
      include: {
        WorkOrders: {
          where: { status: { in: ['ASSIGNED', 'EN_ROUTE', 'IN_PROGRESS'] } },
          include: { CityAsset: true }
        }
      }
    });

    return NextResponse.json(crews);
  } catch (error) {
    console.error("Error fetching crews:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
