import { PrismaClient, UnitType } from "@prisma/client";

export async function seedHealthcare(prisma: PrismaClient, zones: any[]) {
  console.log("Seeding Healthcare Assets & Emergency Units...");

  const hospitals = [
    { name: "Rajiv Gandhi Govt General Hospital", type: "GOVERNMENT_HOSPITAL", beds: 1500, icu: 200, er: 100, latOffset: 0.002, lngOffset: -0.001 },
    { name: "Apollo Main Hospital Greams", type: "PRIVATE_HOSPITAL", beds: 800, icu: 150, er: 80, latOffset: -0.003, lngOffset: 0.002 },
    { name: "MIOT International", type: "TRAUMA_CENTER", beds: 1000, icu: 250, er: 120, latOffset: 0.001, lngOffset: 0.003 },
    { name: "Stanley Medical College", type: "GOVERNMENT_HOSPITAL", beds: 1200, icu: 150, er: 90, latOffset: 0.004, lngOffset: -0.002 },
    { name: "Kilpauk Medical College", type: "GOVERNMENT_HOSPITAL", beds: 900, icu: 100, er: 60, latOffset: -0.001, lngOffset: -0.004 },
    { name: "Fortis Malar Hospital", type: "PRIVATE_HOSPITAL", beds: 500, icu: 80, er: 40, latOffset: 0.002, lngOffset: 0.001 },
    { name: "Global Hospitals", type: "PRIVATE_HOSPITAL", beds: 700, icu: 120, er: 70, latOffset: -0.002, lngOffset: 0.002 },
    { name: "Tambaram Sanatorium", type: "GOVERNMENT_HOSPITAL", beds: 600, icu: 50, er: 40, latOffset: 0.005, lngOffset: 0.005 },
    { name: "Adyar Cancer Institute", type: "PRIVATE_HOSPITAL", beds: 400, icu: 60, er: 20, latOffset: -0.001, lngOffset: 0.001 },
    { name: "Royapettah Govt Hospital", type: "EMERGENCY_CENTER", beds: 800, icu: 100, er: 80, latOffset: 0.001, lngOffset: -0.002 }
  ];

  let hospitalIndex = 0;

  for (const zone of zones) {
    if (hospitalIndex >= hospitals.length) break;
    
    const h = hospitals[hospitalIndex];
    const lat = zone.centerLat + h.latOffset;
    const lng = zone.centerLng + h.lngOffset;
    const assetCode = `HOSP-${100 + hospitalIndex}`;

    const cityAsset = await prisma.cityAsset.upsert({
      where: { assetCode },
      update: { lat, lng, zoneId: zone.id },
      create: {
        assetCode,
        name: h.name,
        assetType: "HEALTHCARE",
        category: "HEALTHCARE",
        lat,
        lng,
        zoneId: zone.id,
        refType: "HealthcareFacility"
      }
    });

    const facility = await prisma.healthcareFacility.upsert({
      where: { facilityCode: assetCode },
      update: {
        totalBeds: h.beds,
        icuBeds: h.icu,
        emergencyBeds: h.er,
        ambulanceCapacity: 5,
        lat,
        lng
      },
      create: {
        cityAssetId: cityAsset.id,
        facilityCode: assetCode,
        name: h.name,
        facilityType: h.type,
        zoneId: zone.id,
        lat,
        lng,
        totalBeds: h.beds,
        icuBeds: h.icu,
        emergencyBeds: h.er,
        ambulanceCapacity: 5,
        availableAmbulances: 5
      }
    });
    
    await prisma.cityAsset.update({
      where: { id: cityAsset.id },
      data: { refId: facility.id }
    });

    hospitalIndex++;
  }

  for (let i = 1; i <= 25; i++) {
    const assetCode = `AMB-${String(i).padStart(3, '0')}`;
    const zone = zones[i % zones.length];
    const lat = zone.centerLat + (Math.random() - 0.5) * 0.02;
    const lng = zone.centerLng + (Math.random() - 0.5) * 0.02;

    const cityAsset = await prisma.cityAsset.upsert({
      where: { assetCode },
      update: { lat, lng, zoneId: zone.id },
      create: {
        assetCode,
        name: `Ambulance Unit ${i}`,
        assetType: "EMERGENCY_UNIT",
        category: "HEALTHCARE",
        lat,
        lng,
        zoneId: zone.id,
        refType: "EmergencyUnit"
      }
    });

    let unitId = cityAsset.refId;
    if (!unitId) {
      const unit = await prisma.emergencyUnit.create({
        data: {
          name: `Ambulance Unit ${i}`,
          type: UnitType.ambulance,
          lat,
          lng,
          isAvailable: true,
          status: "AVAILABLE",
          crewState: "READY"
        }
      });
      unitId = unit.id;
      await prisma.cityAsset.update({
        where: { id: cityAsset.id },
        data: { refId: unitId }
      });
    } else {
      await prisma.emergencyUnit.update({
        where: { id: unitId },
        data: {
          lat,
          lng,
          status: "AVAILABLE",
          crewState: "READY",
          isAvailable: true,
          destinationFacilityId: null,
          eta: null,
          currentIncidentId: null
        }
      });
    }
  }

  console.log("Healthcare and Disaster assets seeded.");
}
