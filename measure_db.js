const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tables = [
    'zone', 'junction', 'trafficReading', 'auditLog', 'cctvFeed',
    'waterSensor', 'waterReading', 'emergencyUnit', 'incident',
    'cityAsset', 'cityEvent', 'environmentSensor', 'garbageBin',
    'wasteVehicle', 'wasteRoute', 'healthcareFacility', 'publicVehicle',
    'streetLight', 'energyAsset', 'telemetrySample', 'workOrder',
    'infrastructureProject', 'maintenanceCrew', 'workOrderUpdate',
    'transitRoute', 'transitStop', 'transitVehicle', 'citizenServiceRequest',
    'predictionSnapshot'
  ];

  console.log("Database Row Counts:");
  const results = {};
  for (const table of tables) {
    try {
      if (prisma[table]) {
         const count = await prisma[table].count();
         results[table] = count;
      }
    } catch (e) {
      console.log(`Failed to count ${table}: ${e.message}`);
    }
  }
  
  // Sort by count descending
  const sorted = Object.entries(results).sort((a, b) => b[1] - a[1]);
  for (const [table, count] of sorted) {
    console.log(`${table.padEnd(25)} : ${count}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
