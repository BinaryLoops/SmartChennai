import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function GET() {
  try {
    let config = await prisma.simulationSetting.findUnique({ where: { key: "global" } });
    if (!config) {
      config = await prisma.simulationSetting.create({
        data: { key: "global" }
      });
    }
    return NextResponse.json({ config });
  } catch (error) {
    console.error("[api/admin/config] GET error:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const role = cookies().get("user_role")?.value;
    if (role !== "super_admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const sum = (body.trafficWeight || 0) + (body.responseWeight || 0) + (body.floodWeight || 0) + (body.incidentWeight || 0) + (body.citizenSatWeight || 0);
    if (sum !== 100) {
      return NextResponse.json({ error: "Weights must sum to 100" }, { status: 400 });
    }

    const [updated] = await prisma.$transaction([
      prisma.simulationSetting.update({
        where: { key: "global" },
        data: {
          demoModeEnabled: body.demoModeEnabled,
          slaThresholdMins: body.slaThresholdMins,
          trafficWeight: body.trafficWeight,
          responseWeight: body.responseWeight,
          floodWeight: body.floodWeight,
          incidentWeight: body.incidentWeight,
          citizenSatWeight: body.citizenSatWeight,
          rateLimitMax: body.rateLimitMax,
          rateLimitWindow: body.rateLimitWindow,
        }
      }),
      prisma.auditLog.create({
        data: {
          actionType: "UPDATE_SYSTEM_CONFIG",
          newValues: body,
          operatorId: "super_admin"
        }
      })
    ]);

    return NextResponse.json({ config: updated });
  } catch (error) {
    console.error("[api/admin/config] PATCH error:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
