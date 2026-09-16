import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const zones = await prisma.zone.findMany();
  console.log("Seeding environment sensors for " + zones.length + " zones...");
  
  for (const [i, zone] of zones.entries()) {
    const assetCode = `ENV-${zone.name.substring(0, 3).toUpperCase()}-${i + 1}`;
    const lat = 13.0 + Math.random() * 0.15;
    const lng = 80.15 + Math.random() * 0.15;
    
    // Check if asset already exists
    const existing = await prisma.cityAsset.findUnique({ where: { assetCode } });
    if (!existing) {
        const envSensor = await prisma.environmentSensor.create({
          data: {
            sensorType: "MULTISENSOR",
            aqi: 40 + Math.random() * 30,
            pm25: 12 + Math.random() * 10,
            pm10: 20 + Math.random() * 15,
            no2: 8 + Math.random() * 5,
            co: 0.3 + Math.random() * 0.5,
            temperature: 30 + Math.random() * 5,
            humidity: 50 + Math.random() * 20,
            rainfall: 0,
            windSpeed: 2 + Math.random() * 6,
            noise: 45 + Math.random() * 20,
            uv: Math.random() * 5
          }
        });

        await prisma.cityAsset.create({
          data: {
            assetCode,
            name: `Air Quality Station - ${zone.name}`,
            assetType: "environment_sensor",
            category: "ENVIRONMENT",
            lat,
            lng,
            zoneId: zone.id,
            ward: `Ward ${i + 1}`,
            status: "HEALTHY",
            healthScore: 100,
            refType: "EnvironmentSensor",
            refId: envSensor.id,
            isDemo: true,
            metadata: {
              manufacturer: "GovTech Sensors",
              model: "AQ-500",
              installed: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()
            }
          }
        });
        console.log(`Created ${assetCode}`);
    } else {
        console.log(`Skipped ${assetCode}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
