import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  try {
    const role = cookies().get("user_role")?.value;
    if (role !== "super_admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const limit = Number(searchParams.get("limit")) || 50;
    const page = Number(searchParams.get("page")) || 1;

    // Simple search by actionType
    const logs = await prisma.auditLog.findMany({
      where: {
        actionType: { contains: search, mode: "insensitive" }
      },
      orderBy: { timestamp: "desc" },
      take: limit,
      skip: (page - 1) * limit
    });

    const total = await prisma.auditLog.count({
      where: {
        actionType: { contains: search, mode: "insensitive" }
      }
    });

    return NextResponse.json({
      logs,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("[api/admin/audit-logs] GET error:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
