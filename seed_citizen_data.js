const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding citizen demo data...');

  const demoIncidents = [
    {
      type: 'traffic',
      lat: 13.0410,
      lng: 80.2337,
      severity: 3,
      status: 'reported',
      source: 'citizen',
      description: 'Major traffic block due to broken down truck near Panagal Park.',
      referenceId: 'INC-1001',
      reportedAt: new Date(Date.now() - 1000 * 60 * 15), // 15 mins ago
    },
    {
      type: 'flood',
      lat: 13.0106,
      lng: 80.1988,
      severity: 4,
      status: 'dispatched',
      source: 'citizen',
      description: 'Severe waterlogging under Kathipara flyover. Vehicles stuck.',
      referenceId: 'INC-1002',
      reportedAt: new Date(Date.now() - 1000 * 60 * 60), // 1 hr ago
      dispatchedAt: new Date(Date.now() - 1000 * 60 * 45), // 45 mins ago
    },
    {
      type: 'medical',
      lat: 13.0827,
      lng: 80.2707,
      severity: 5,
      status: 'in_progress',
      source: 'citizen',
      description: 'Cardiac arrest reported at Central Station.',
      referenceId: 'INC-1003',
      reportedAt: new Date(Date.now() - 1000 * 60 * 30), // 30 mins ago
      dispatchedAt: new Date(Date.now() - 1000 * 60 * 28), // 28 mins ago
    },
    {
      type: 'fire',
      lat: 13.0012,
      lng: 80.2565,
      severity: 4,
      status: 'resolved',
      source: 'citizen',
      description: 'Transformer caught fire in Adyar.',
      referenceId: 'INC-1004',
      reportedAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hrs ago
      dispatchedAt: new Date(Date.now() - 1000 * 60 * 115), // 1h 55m ago
      resolvedAt: new Date(Date.now() - 1000 * 60 * 15), // 15 mins ago
      resolutionNotes: 'Fire put out by Engine 4. No casualties.',
    }
  ];

  for (const inc of demoIncidents) {
    await prisma.incident.upsert({
      where: { referenceId: inc.referenceId },
      update: inc,
      create: inc,
    });
    console.log("Upserted incident: " + inc.referenceId);
  }

  console.log('Done seeding citizen data.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
