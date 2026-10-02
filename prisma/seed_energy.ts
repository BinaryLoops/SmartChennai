import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function seedEnergy(prisma: PrismaClient, zones: any[]) {
  console.log("Seeding Energy Assets...");

  for (const [i, zone] of zones.entries()) {
    // 1 Substation per zone
    const subCode = `SUB-${zone.name.substring(0, 3).toUpperCase()}-01`;
    // We expect centerLat/centerLng logic from seed, but let's just parse the boundary or use a known offset from an existing asset in the zone.
    // Instead of querying boundary, let's just find an environment sensor or junction in the zone to get roughly its center.
    const junc = await prisma.junction.findFirst({ where: { zoneId: zone.id } });
    if (!junc) continue;

    const subLat = junc.lat;
    const subLng = junc.lng;

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

    // 2 Transformers per zone
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
          energyAssetId: transformer.id, // powers itself
          isDemo: true
        }
      });

      // Link half of the zone's streetlights to transformer 1, half to transformer 2
      const streetlights = await prisma.streetLight.findMany({ where: { zoneId: zone.id } });
      const myStreetlights = t === 1 ? streetlights.slice(0, Math.floor(streetlights.length / 2)) : streetlights.slice(Math.floor(streetlights.length / 2));
      for (const sl of myStreetlights) {
        await prisma.streetLight.update({
          where: { id: sl.id },
          data: { energyAssetId: transformer.id }
        });
      }
      
      // Link junctions and cctvs
      const cctvs = await prisma.cCTVFeed.findMany({ where: { junction: { zoneId: zone.id } } });
      for (const c of cctvs) {
        // Find city asset
        const ca = await prisma.cityAsset.findFirst({ where: { refId: c.id, refType: "CCTVFeed" }});
        if (ca && Math.random() > 0.5) { // Roughly distribute power dependency
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

  console.log("Energy Assets seeded.");
}
