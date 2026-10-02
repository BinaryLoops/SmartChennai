import { PrismaClient } from '@prisma/client';

export async function seedPublicWorks(prisma: PrismaClient) {
  console.log('Seeding Public Works...');

  // Ensure zones exist
  const zones = await prisma.zone.findMany();
  if (zones.length === 0) {
    console.log('No zones found. Skipping Public Works seeding.');
    return;
  }

  // Generate synthetic projects
  const projects = [
    {
      projectCode: 'PROJ-RD-2026-001',
      name: 'Anna Salai Road Widening',
      description: 'Widening of Anna Salai to accommodate BRTS lane.',
      projectType: 'ROAD',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      zoneId: zones.find(z => z.name === 'Zone 9 - Teynampet')?.id || zones[0].id,
      lat: 13.0450,
      lng: 80.2450,
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      plannedEndDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      progressPercent: 32.5,
      budgetPlanned: 5000000,
      budgetSpent: 1600000,
      contractorName: 'Chennai Builders Corp',
      department: 'Roads & Bridges',
      projectManager: 'Vikram S.',
    },
    {
      projectCode: 'PROJ-DR-2026-042',
      name: 'T. Nagar Stormwater Drain Upgrade',
      description: 'Deepening and desilting of primary stormwater drains in T. Nagar.',
      projectType: 'STORMWATER',
      status: 'IN_PROGRESS',
      priority: 'CRITICAL',
      zoneId: zones.find(z => z.name === 'Zone 10 - Kodambakkam')?.id || zones[0].id,
      lat: 13.0400,
      lng: 80.2330,
      startDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      plannedEndDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
      progressPercent: 12.0,
      budgetPlanned: 2000000,
      budgetSpent: 300000,
      contractorName: 'AquaFlow Infra',
      department: 'Stormwater Drain',
      projectManager: 'Priya R.',
    }
  ];

  for (const p of projects) {
    await prisma.infrastructureProject.upsert({
      where: { projectCode: p.projectCode },
      update: p,
      create: p,
    });
  }

  // Generate Crews
  const crews = [
    { crewCode: 'CREW-ELEC-01', department: 'Electrical', specialization: 'ELECTRICAL', lat: 13.05, lng: 80.25, capacity: 2 },
    { crewCode: 'CREW-ELEC-02', department: 'Electrical', specialization: 'ELECTRICAL', lat: 13.02, lng: 80.21, capacity: 2 },
    { crewCode: 'CREW-DRN-01', department: 'Water & Drainage', specialization: 'DRAINAGE', lat: 13.03, lng: 80.23, capacity: 3 },
    { crewCode: 'CREW-RD-01', department: 'Roads', specialization: 'ROAD', lat: 13.045, lng: 80.24, capacity: 4 },
  ];

  for (const c of crews) {
    await prisma.maintenanceCrew.upsert({
      where: { crewCode: c.crewCode },
      update: c,
      create: c,
    });
  }

  console.log('Public Works seeding completed.');
}
