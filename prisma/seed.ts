import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const zoneNames = [
  { name: "Kathipara", lat: 13.0106, lng: 80.1988 },
  { name: "T. Nagar", lat: 13.0410, lng: 80.2337 },
  { name: "Anna Nagar", lat: 13.0847, lng: 80.2119 },
  { name: "Adyar", lat: 13.0064, lng: 80.2435 },
  { name: "Velachery", lat: 12.9749, lng: 80.2217 },
  { name: "Tambaram", lat: 12.9249, lng: 80.1100 },
  { name: "Perungudi", lat: 12.9667, lng: 80.2425 },
  { name: "Ambattur", lat: 13.1143, lng: 80.1548 },
  { name: "Sholinganallur", lat: 12.9008, lng: 80.2279 },
  { name: "Guindy", lat: 13.0063, lng: 80.2206 }
];

async function main() {
  console.log("Seeding zones...");
  const zones = [];
  for (const z of zoneNames) {
    const zone = await prisma.zone.create({
      data: {
        name: z.name,
        population: 400000 + Math.round(Math.random() * 300000),
        boundary: {
          type: "Polygon",
          coordinates: [
            [
              [z.lng - 0.01, z.lat - 0.01],
              [z.lng + 0.01, z.lat - 0.01],
              [z.lng + 0.01, z.lat + 0.01],
              [z.lng - 0.01, z.lat + 0.01],
              [z.lng - 0.01, z.lat - 0.01]
            ]
          ]
        },
      },
    });
    zones.push({ ...zone, centerLat: z.lat, centerLng: z.lng });
  }

  console.log("Seeding junctions...");
  for (let i = 0; i < zones.length; i++) {
    const z = zones[i];
    // Main junction at center
    await prisma.junction.create({
      data: {
        name: `${z.name} Main Junction`,
        lat: z.centerLat,
        lng: z.centerLng,
        zoneId: z.id,
      },
    });
    // Secondary junction nearby
    await prisma.junction.create({
      data: {
        name: `${z.name} Sector 2 Junction`,
        lat: z.centerLat + 0.005,
        lng: z.centerLng - 0.005,
        zoneId: z.id,
      },
    });
  }

  console.log("Seeding CCTV feeds...");
  await prisma.cCTVFeed.deleteMany();
  const allJunctions = await prisma.junction.findMany({ select: { id: true, lat: true, lng: true } });
  for (const j of allJunctions) {
    await prisma.cCTVFeed.create({
      data: {
        junctionId: j.id,
        lat: j.lat + 0.0005,
        lng: j.lng - 0.0005,
        status: "online",
        lastEvent: null,
      },
    });
  }

  console.log("Seeding water sensors...");
  for (const zone of zones) {
    await prisma.waterSensor.create({
      data: {
        zoneId: zone.id,
        lat: zone.centerLat - 0.008,
        lng: zone.centerLng + 0.002,
        waterLevel: 20 + Math.random() * 10,
      },
    });
  }

  console.log("Seeding garbage bins...");
  for (const zone of zones) {
    for(let i=1; i<=3; i++) {
      await prisma.garbageBin.create({
        data: {
          zoneId: zone.id,
          lat: zone.centerLat + (Math.random() - 0.5) * 0.015,
          lng: zone.centerLng + (Math.random() - 0.5) * 0.015,
          fillPercentage: Math.random() * 60,
          status: "ok",
          lastCollected: new Date()
        }
      });
    }
  }

  console.log("Seeding environment sensors...");
  for (const [i, zone] of zones.entries()) {
    const assetCode = `ENV-${zone.name.substring(0, 3).toUpperCase()}-${i + 1}`;
    const lat = zone.centerLat + 0.006;
    const lng = zone.centerLng + 0.004;
    
    // Create the EnvironmentSensor
    const envSensor = await prisma.environmentSensor.create({
      data: {
        sensorType: "MULTISENSOR",
        aqi: 40 + Math.random() * 20,
        pm25: 12 + Math.random() * 10,
        pm10: 20 + Math.random() * 15,
        no2: 8 + Math.random() * 5,
        co: 0.3 + Math.random() * 0.5,
        temperature: 30 + Math.random() * 2,
        humidity: 50 + Math.random() * 10,
        rainfall: 0,
        windSpeed: 2 + Math.random() * 4,
        noise: 45 + Math.random() * 10,
        uv: Math.random() * 5
      }
    });

    // Create the Universal CityAsset identity pointing to it
    await prisma.cityAsset.upsert({
      where: { assetCode },
      update: {
        refId: envSensor.id,
        lat,
        lng
      },
      create: {
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
  }

  console.log("Seeding waste vehicles...");
  const wasteVehicles = [];
  for (let i = 1; i <= 15; i++) {
    const assetCode = `SW-${String(i).padStart(3, '0')}`;
    const zone = zones[i % zones.length];
    
    const lat = zone.centerLat + (Math.random() - 0.5) * 0.02;
    const lng = zone.centerLng + (Math.random() - 0.5) * 0.02;

    const vehicle = await prisma.wasteVehicle.upsert({
      where: { assetCode },
      update: { lat, lng },
      create: {
        assetCode,
        lat,
        lng,
        capacity: 100,
        currentLoad: 0,
        status: "AVAILABLE",
      }
    });

    await prisma.cityAsset.upsert({
      where: { assetCode },
      update: {
        refId: vehicle.id,
        lat,
        lng
      },
      create: {
        assetCode,
        name: `Solid Waste Compactor ${assetCode}`,
        assetType: "waste_vehicle",
        category: "WASTE",
        lat,
        lng,
        zoneId: null, // vehicles roam, don't belong strictly to one zone forever
        status: "HEALTHY",
        healthScore: 100,
        refType: "WasteVehicle",
        refId: vehicle.id,
        isDemo: true,
        metadata: {
          manufacturer: "GovTech Motors",
          capacityTons: 10
        }
      }
    });

    wasteVehicles.push(vehicle);
  }

  await prisma.simulationSetting.upsert({
    where: { key: "global" },
    update: {},
    create: { key: "global", monsoonEnabled: false },
  });

  
  console.log("Seeding demo users...");
  const salt = await bcrypt.genSalt(10);
  const demoUsers = [
    { email: "citizen.demo", name: "Demo Citizen", role: Role.citizen, passwordHash: await bcrypt.hash("Citizen@123", salt) },
    { email: "traffic.demo", name: "Traffic Operator", role: Role.traffic_operator, passwordHash: await bcrypt.hash("Traffic@123", salt) },
    { email: "emergency.demo", name: "Emergency Operator", role: Role.emergency_operator, passwordHash: await bcrypt.hash("Emergency@123", salt) },
    { email: "water.demo", name: "Water Operator", role: Role.water_operator, passwordHash: await bcrypt.hash("Water@123", salt) },
    { email: "executive.demo", name: "City Executive", role: Role.executive, passwordHash: await bcrypt.hash("Executive@123", salt) },
    { email: "admin.demo", name: "Super Admin", role: Role.super_admin, passwordHash: await bcrypt.hash("Admin@123", salt) },
  ];

  for (const u of demoUsers) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { passwordHash: u.passwordHash, role: u.role, name: u.name },
      create: u,
    });
  }

  console.log("Seeding Energy Assets...");
  for (const [i, zone] of zones.entries()) {
    const subCode = `SUB-${zone.name.substring(0, 3).toUpperCase()}-01`;
    const subLat = zone.centerLat;
    const subLng = zone.centerLng;

    const substation = await prisma.energyAsset.upsert({
      where: { id: `seed-sub-${zone.id}` },
      update: {},
      create: {
        id: `seed-sub-${zone.id}`,
        type: "SUBSTATION",
        zoneId: zone.id,
        lat: subLat,
        lng: subLng,
        capacity: 1000,
        status: "NORMAL",
      }
    });

    await prisma.cityAsset.upsert({
      where: { assetCode: subCode },
      update: {
        refId: substation.id,
        energyAssetId: substation.id,
      },
      create: {
        assetCode: subCode,
        name: `Substation ${zone.name}`,
        assetType: "substation",
        category: "ENERGY",
        lat: subLat,
        lng: subLng,
        zoneId: zone.id,
        status: "HEALTHY",
        refType: "EnergyAsset",
        refId: substation.id,
        energyAssetId: substation.id,
        isDemo: true
      }
    });

    for (let t = 1; t <= 2; t++) {
      const trfCode = `TRF-${zone.name.substring(0, 3).toUpperCase()}-0${t}`;
      const trfLat = subLat + (Math.random() - 0.5) * 0.01;
      const trfLng = subLng + (Math.random() - 0.5) * 0.01;

      const transformer = await prisma.energyAsset.upsert({
        where: { id: `seed-trf-${zone.id}-${t}` },
        update: {},
        create: {
          id: `seed-trf-${zone.id}-${t}`,
          type: "TRANSFORMER",
          zoneId: zone.id,
          lat: trfLat,
          lng: trfLng,
          capacity: 100,
          status: "NORMAL",
          parentId: substation.id
        }
      });

      await prisma.cityAsset.upsert({
        where: { assetCode: trfCode },
        update: {
          refId: transformer.id,
          energyAssetId: transformer.id,
        },
        create: {
          assetCode: trfCode,
          name: `Transformer ${trfCode}`,
          assetType: "transformer",
          category: "ENERGY",
          lat: trfLat,
          lng: trfLng,
          zoneId: zone.id,
          status: "HEALTHY",
          refType: "EnergyAsset",
          refId: transformer.id,
          energyAssetId: transformer.id,
          isDemo: true
        }
      });

      const streetlights = await prisma.streetLight.findMany({ where: { zoneId: zone.id } });
      const myStreetlights = t === 1 ? streetlights.slice(0, Math.floor(streetlights.length / 2)) : streetlights.slice(Math.floor(streetlights.length / 2));
      for (const sl of myStreetlights) {
        await prisma.streetLight.update({
          where: { id: sl.id },
          data: { energyAssetId: transformer.id }
        });
      }
      
      const cctvs = await prisma.cCTVFeed.findMany({ where: { junction: { zoneId: zone.id } } });
      for (const c of cctvs) {
        const ca = await prisma.cityAsset.findFirst({ where: { refId: c.id, refType: "CCTVFeed" }});
        if (ca && Math.random() > 0.5) { 
           await prisma.cityAsset.update({ where: { id: ca.id }, data: { energyAssetId: transformer.id } });
        }
      }
      
      const juncs = await prisma.junction.findMany({ where: { zoneId: zone.id } });
      for (const j of juncs) {
        const ca = await prisma.cityAsset.findFirst({ where: { refId: j.id, refType: "Junction" }});
        if (ca && Math.random() > 0.5) {
           await prisma.cityAsset.update({ where: { id: ca.id }, data: { energyAssetId: transformer.id } });
        }
      }
    }
  }

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
