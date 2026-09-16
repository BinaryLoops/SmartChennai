import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { setSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.isActive || !user.passwordHash) {
      // In production, use generic message. For demo, be explicit if user not found.
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);

    if (!isValid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Set JWT in HttpOnly cookie
    await setSession({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        actionType: "LOGIN",
        operatorId: user.id,
        newValues: JSON.parse(JSON.stringify({ role: user.role })),
      }
    });

    return NextResponse.json({ success: true, role: user.role });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
