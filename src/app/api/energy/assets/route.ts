import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const assets = await prisma.energyAsset.findMany();
    return NextResponse.json(assets);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch energy assets" }, { status: 500 });
  }
}
