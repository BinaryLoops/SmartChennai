import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const assets = await prisma.cityAsset.findMany({
      where: {
        category: "ENVIRONMENT",
        refType: "EnvironmentSensor",
      },
    });

    const envSensors = await prisma.environmentSensor.findMany();
    const envMap = new Map(envSensors.map(s => [s.id, s]));

    const payload = assets.map(asset => {
      const env = envMap.get(asset.refId!);
      return {
        id: asset.id,
        name: asset.name,
        lat: asset.lat,
        lng: asset.lng,
        zoneId: asset.zoneId,
        status: asset.status,
        aqi: env?.aqi || 50,
        temperature: env?.temperature || 32,
        rainfall: env?.rainfall || 0,
        pm25: env?.pm25 || 15,
        pm10: env?.pm10 || 20,
        no2: env?.no2 || 10,
        co: env?.co || 0.5,
        windSpeed: env?.windSpeed || 5,
        noise: env?.noise || 50,
        uv: env?.uv || 0,
      };
    });

    return NextResponse.json({ sensors: payload });
  } catch (err) {
    console.error("[api] environment route error:", err);
    return NextResponse.json({ error: "Failed to fetch environment data" }, { status: 500 });
  }
}
