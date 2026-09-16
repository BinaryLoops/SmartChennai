const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Starting advanced idempotent demo data seeding...");

  // 1. Fetch some junctions and zones to associate data
  const zones = await prisma.zone.findMany();
  const junctions = await prisma.junction.findMany();

  if (!zones.length || !junctions.length) {
    console.error("No zones or junctions found. Please run the base seed first.");
    return;
  }

  // 2. Seed Emergency Units (Idempotent via upsert by name/type, but we don't have unique constraint on name. We will use a unique deterministic ID for them.)
  // Wait, EmergencyUnit schema doesn't have unique field other than ID. We can just delete DEMO units first.
  console.log("Cleaning up previous DEMO emergency units...");
  await prisma.emergencyUnit.deleteMany({
    where: { name: { startsWith: 'DEMO-' } }
  });

  console.log("Seeding DEMO emergency units...");
  const demoUnits = [
    { name: 'DEMO-Ambulance 1', type: 'ambulance', lat: 13.0827, lng: 80.2707, isAvailable: true },
    { name: 'DEMO-Ambulance 2', type: 'ambulance', lat: 13.0410, lng: 80.2337, isAvailable: false },
    { name: 'DEMO-Ambulance 3', type: 'ambulance', lat: 13.0106, lng: 80.1988, isAvailable: true },
    { name: 'DEMO-Fire Engine A', type: 'fire_truck', lat: 13.0012, lng: 80.2565, isAvailable: false },
    { name: 'DEMO-Fire Engine B', type: 'fire_truck', lat: 13.0500, lng: 80.2000, isAvailable: true },
  ];
  
  const createdUnits = [];
  for (const u of demoUnits) {
    const unit = await prisma.emergencyUnit.create({ data: u });
    createdUnits.push(unit);
  }

  // 3. Seed Incidents
  console.log("Cleaning up previous DEMO incidents...");
  await prisma.incident.deleteMany({
    where: { referenceId: { startsWith: 'DEMO-INC-' } }
  });
  
  console.log("Seeding DEMO incidents...");
  const now = Date.now();
  
  const demoIncidents = [
    {
      type: 'traffic', lat: junctions[0].lat, lng: junctions[0].lng, severity: 3, status: 'reported',
      source: 'sensor', referenceId: 'DEMO-INC-001', reportedAt: new Date(now - 5 * 60000)
    },
    {
      type: 'flood', lat: zones[0].boundary.coordinates[0][0][1], lng: zones[0].boundary.coordinates[0][0][0], severity: 4, status: 'in_progress',
      source: 'citizen', referenceId: 'DEMO-INC-002', reportedAt: new Date(now - 60 * 60000), dispatchedAt: new Date(now - 45 * 60000)
    },
    {
      type: 'fire', lat: 13.0012, lng: 80.2565, severity: 5, status: 'dispatched',
      source: 'department', referenceId: 'DEMO-INC-003', reportedAt: new Date(now - 15 * 60000), dispatchedAt: new Date(now - 5 * 60000),
      unitId: createdUnits[3].id // Assigned to Fire Engine A (unavailable)
    },
    {
      type: 'medical', lat: 13.0410, lng: 80.2337, severity: 5, status: 'arrived',
      source: 'citizen', referenceId: 'DEMO-INC-004', reportedAt: new Date(now - 20 * 60000), dispatchedAt: new Date(now - 18 * 60000),
      unitId: createdUnits[1].id // Assigned to Ambulance 2 (unavailable)
    },
    {
      type: 'traffic', lat: junctions[1].lat, lng: junctions[1].lng, severity: 2, status: 'resolved',
      source: 'sensor', referenceId: 'DEMO-INC-005', reportedAt: new Date(now - 120 * 60000), resolvedAt: new Date(now - 10 * 60000),
      resolutionNotes: 'Cleared by traffic police.'
    }
  ];

  // Add more resolved incidents to fill history
  for (let i = 6; i <= 30; i++) {
    const types = ['traffic', 'flood', 'fire', 'medical'];
    const rType = types[Math.floor(Math.random() * types.length)];
    demoIncidents.push({
      type: rType, lat: 13.0 + Math.random()*0.1, lng: 80.2 + Math.random()*0.1, severity: Math.floor(Math.random()*4)+1,
      status: 'resolved', source: 'citizen', referenceId: 'DEMO-INC-' + i.toString().padStart(3, '0'),
      reportedAt: new Date(now - (i * 60) * 60000),
      resolvedAt: new Date(now - (i * 50) * 60000),
      resolutionNotes: 'Demo historical resolution.'
    });
  }

  for (const inc of demoIncidents) {
    await prisma.incident.create({ data: inc });
  }
  
  const fetchedDemoIncidents = await prisma.incident.findMany({ where: { referenceId: { startsWith: 'DEMO-INC-' } }});

  // 4. Seed Signal Overrides
  console.log("Cleaning up expired DEMO signal overrides...");
  await prisma.signalOverride.deleteMany({
    where: { expiresAt: { lt: new Date() } }
  });
  
  // Add an active override to the first junction
  const existingOverride = await prisma.signalOverride.findUnique({ where: { junctionId: junctions[0].id }});
  if (!existingOverride) {
    await prisma.signalOverride.create({
      data: {
        junctionId: junctions[0].id,
        reason: 'DEMO Emergency corridor',
        expiresAt: new Date(now + 15 * 60000) // 15 mins from now
      }
    });
  }

  // 5. Seed Work Orders (for water)
  console.log("Seeding DEMO work orders...");
  await prisma.workOrder.deleteMany({
    where: { notes: { startsWith: 'DEMO' } }
  });
  
  const floodInc = fetchedDemoIncidents.find(i => i.type === 'flood' && i.status === 'in_progress');
  if (floodInc) {
    await prisma.workOrder.create({
      data: {
        incidentId: floodInc.id,
        assignedTeam: 'Metro Water Rapid Response',
        notes: 'DEMO Pumping operation ongoing',
        startedAt: floodInc.dispatchedAt,
      }
    });
  }

  // 6. Seed Audit Logs
  console.log("Seeding DEMO audit logs...");
  await prisma.auditLog.deleteMany({
    where: { actionType: { startsWith: 'DEMO_' } }
  });
  
  const execUser = await prisma.user.findFirst({ where: { role: 'executive' } });
  
  for (let i = 0; i < 15; i++) {
    await prisma.auditLog.create({
      data: {
        actionType: 'DEMO_ACTION_LOG',
        operatorId: execUser?.id || null,
        timestamp: new Date(now - (i * 20) * 60000),
        newValues: { detail: 'Demo executive review action completed.' }
      }
    });
  }
  
  // Add some specific audit logs for the newly created active incidents
  const fireInc = fetchedDemoIncidents.find(i => i.referenceId === 'DEMO-INC-003');
  if (fireInc) {
    await prisma.auditLog.create({
      data: {
        actionType: 'EMERGENCY_DISPATCH',
        incidentId: fireInc.id,
        operatorId: execUser?.id || null,
        timestamp: fireInc.dispatchedAt || new Date(),
        newValues: { status: 'dispatched', unitId: fireInc.unitId }
      }
    });
  }

  console.log("Advanced seed complete. All dashboards should now have rich demo data.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
