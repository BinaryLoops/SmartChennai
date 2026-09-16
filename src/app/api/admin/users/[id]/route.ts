import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { z } from "zod";

const updateUserSchema = z.object({
  role: z.enum(["citizen", "traffic_operator", "emergency_operator", "water_operator", "executive", "super_admin"]).optional(),
  isActive: z.boolean().optional()
});

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const role = cookies().get("user_role")?.value;
    if (role !== "super_admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const result = updateUserSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: "Invalid data", details: result.error.errors }, { status: 400 });
    }

    const userToUpdate = await prisma.user.findUnique({ where: { id } });
    if (!userToUpdate) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const [updated] = await prisma.$transaction([
      prisma.user.update({
        where: { id },
        data: result.data
      }),
      prisma.auditLog.create({
        data: {
          actionType: "UPDATE_USER",
          oldValues: { role: userToUpdate.role, isActive: userToUpdate.isActive },
          newValues: result.data,
          operatorId: "super_admin" // Hardcoded for demo mock auth
        }
      })
    ]);

    return NextResponse.json({ user: updated });
  } catch (error) {
    console.error("[api/admin/users/id] PATCH error:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
