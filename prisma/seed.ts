import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const zoneNames = [
  "Tiruvottiyur", "Manali", "Madhavaram", "Tondiarpet", "Royapuram",
  "Thiru Vi Ka Nagar", "Ambattur", "Anna Nagar", "Teynampet", "Kodambakkam",
  "Valasaravakkam", "Alandur", "Adyar", "Perungudi", "Sholinganallur",
];

async function main() {
  console.log("Seeding zones...");
  const zones = [];
  for (const [i, name] of zoneNames.entries()) {
    const zone = await prisma.zone.create({
      data: {
        name,
        population: 400000 + Math.round(Math.random() * 300000),
        // Placeholder box geometry — replace with real GCC zone boundaries.
        boundary: {
          type: "Polygon",
          coordinates: [[[80.15 + i * 0.03, 13.0], [80.2 + i * 0.03, 13.0], [80.2 + i * 0.03, 13.15], [80.15 + i * 0.03, 13.15], [80.15 + i * 0.03, 13.0]]],
        },
      },
    });
    zones.push(zone);
  }

  console.log("Seeding junctions...");
  const namedJunctions = [
    { name: "Kathipara Junction", lat: 13.0106, lng: 80.1988 },
    { name: "Panagal Park (T. Nagar)", lat: 13.0410, lng: 80.2337 },
  ];
  for (const j of namedJunctions) {
    await prisma.junction.create({
      data: { ...j, zoneId: zones[Math.floor(Math.random() * zones.length)].id },
    });
  }
  for (let i = 0; i < 18; i++) {
    await prisma.junction.create({
      data: {
        name: `Junction ${i + 1}`,
        lat: 13.0 + Math.random() * 0.15,
        lng: 80.15 + Math.random() * 0.15,
        zoneId: zones[i % zones.length].id,
      },
    });
  }

  console.log("Seeding CCTV feeds...");
  await prisma.cCTVFeed.deleteMany(); // safe re-seed
  const allJunctions = await prisma.junction.findMany({ select: { id: true, lat: true, lng: true } });
  for (const j of allJunctions) {
    await prisma.cCTVFeed.create({
      data: {
        junctionId: j.id,
        lat: j.lat + (Math.random() - 0.5) * 0.001,
        lng: j.lng + (Math.random() - 0.5) * 0.001,
        status: Math.random() < 0.85 ? "online" : "offline",
        lastEvent: null,
      },
    });
  }

  console.log("Seeding water sensors...");
  for (const zone of zones) {
    for (let s = 0; s < 2; s++) {
      await prisma.waterSensor.create({
        data: {
          zoneId: zone.id,
          lat: 13.0 + Math.random() * 0.15,
          lng: 80.15 + Math.random() * 0.15,
          waterLevel: 20 + Math.random() * 40, // baseline 20–60 cm
        },
      });
    }
  }

  console.log("Seeding simulation settings...");
  await prisma.simulationSetting.upsert({
    where: { key: "global" },
    update: {},
    create: { key: "global", monsoonEnabled: false },
  });

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
