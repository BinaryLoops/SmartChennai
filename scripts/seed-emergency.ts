import { PrismaClient, UnitType } from "@prisma/client";

const prisma = new PrismaClient();

const baseStations = [
  { name: "Central Hospital Ambulance 1", type: UnitType.ambulance, lat: 13.0827, lng: 80.2707 },
  { name: "South City Ambulance 2", type: UnitType.ambulance, lat: 12.9716, lng: 80.2532 },
  { name: "Coastal Rescue Ambulance 3", type: UnitType.ambulance, lat: 12.8996, lng: 80.2209 },
  { name: "North Chennai Fire Station 1", type: UnitType.fire_truck, lat: 13.1143, lng: 80.2825 },
  { name: "T-Nagar Fire Station 2", type: UnitType.fire_truck, lat: 13.0418, lng: 80.2341 },
];

async function main() {
  console.log("Seeding emergency units...");
  
  for (const station of baseStations) {
    await prisma.emergencyUnit.create({
      data: station,
    });
  }

  console.log("Emergency units seeded successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
