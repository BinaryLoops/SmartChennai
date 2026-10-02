import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const projects = await prisma.infrastructureProject.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        Zone: true,
        AffectedAssets: true,
        WorkOrders: {
          select: { id: true, status: true, priority: true }
        }
      }
    });

    return NextResponse.json(projects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
