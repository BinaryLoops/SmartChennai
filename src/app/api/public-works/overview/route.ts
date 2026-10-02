import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const [openWOs, crews, projects] = await Promise.all([
      prisma.workOrder.count({ where: { status: { in: ['OPEN', 'ASSIGNED', 'EN_ROUTE', 'IN_PROGRESS', 'VERIFICATION'] } } }),
      prisma.maintenanceCrew.count({ where: { status: 'AVAILABLE' } }),
      prisma.infrastructureProject.findMany({ where: { status: { in: ['IN_PROGRESS', 'AT_RISK', 'DELAYED'] } } })
    ]);

    const slaAtRisk = await prisma.workOrder.count({
      where: {
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
        slaDueAt: { lte: new Date(Date.now() + 2 * 60 * 60 * 1000) }
      }
    });

    const slaBreached = await prisma.workOrder.count({
      where: {
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
        slaDueAt: { lte: new Date() }
      }
    });

    return NextResponse.json({
      openWorkOrders: openWOs,
      activeCrews: crews,
      projectsInProgress: projects.length,
      projectsAtRisk: projects.filter(p => p.status === 'AT_RISK' || p.status === 'DELAYED').length,
      slaAtRisk,
      slaBreached
    });
  } catch (error) {
    console.error("Error fetching public works overview:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
