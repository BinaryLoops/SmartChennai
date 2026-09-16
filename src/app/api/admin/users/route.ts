import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { z } from "zod";

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  role: z.enum(["citizen", "traffic_operator", "emergency_operator", "water_operator", "executive", "super_admin"]),
  department: z.string().optional()
});

export async function GET(request: Request) {
  try {
    const role = cookies().get("user_role")?.value;
    if (role !== "super_admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } }
        ]
      },
      orderBy: { createdAt: "desc" },
      take: 100 // Hard limit for demo
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("[api/admin/users] GET error:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const role = cookies().get("user_role")?.value;
    if (role !== "super_admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const result = createUserSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json({ error: "Invalid data", details: result.error.errors }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: result.data.email }
    });

    if (existingUser) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 400 });
    }

    const [user] = await prisma.$transaction([
      prisma.user.create({
        data: {
          name: result.data.name,
          email: result.data.email,
          role: result.data.role,
          department: result.data.department,
        }
      }),
      prisma.auditLog.create({
        data: {
          actionType: "CREATE_USER",
          newValues: result.data,
          operatorId: "super_admin"
        }
      })
    ]);

    return NextResponse.json({ user });
  } catch (error) {
    console.error("[api/admin/users] POST error:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
