import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [openIncidents, resolvedIncidents, units] = await Promise.all([
      // Open incidents
      prisma.incident.findMany({
        where: {
          status: { not: "resolved" },
        },
        include: {
          unit: true,
        },
        orderBy: {
          reportedAt: "desc",
        },
      }),

      // Resolved incidents (for response time KPI and resolved tab)
      prisma.incident.findMany({
        where: {
          status: "resolved",
        },
        include: {
          unit: true,
        },
        orderBy: {
          resolvedAt: "desc",
        },
        take: 100, // Limit to recent 100 for performance
      }),

      // All emergency units
      prisma.emergencyUnit.findMany(),
    ]);

    return NextResponse.json({
      openIncidents,
      resolvedIncidents,
      units,
    });
  } catch (error) {
    console.error("[api/dashboard/emergency] error:", error);
    return NextResponse.json(
      { error: "Failed to load emergency data" },
      { status: 500 }
    );
  }
}
