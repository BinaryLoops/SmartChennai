const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Starting advanced Phase 1 city seed for extended domains...");
  const zones = await prisma.zone.findMany();

  if (!zones.length) {
    console.error("No zones found. Please run base seed first.");
    return;
  }

  const now = Date.now();

  // 1. Environment Sensors
  console.log("Seeding Environment Sensors...");
  for (const zone of zones) {
    // 2 sensors per zone
    for (let i = 1; i <= 2; i++) {
      const id = `env-sensor-${zone.id}-${i}`;
      await prisma.environmentSensor.upsert({
        where: { id },
        update: {},
        create: {
          id,
          zoneId: zone.id,
          lat: zone.boundary.coordinates[0][0][1] + (Math.random() * 0.01),
          lng: zone.boundary.coordinates[0][0][0] + (Math.random() * 0.01),
          aqi: 40 + Math.floor(Math.random() * 40),
          pm25: 12 + Math.floor(Math.random() * 20),
          temperature: 30 + (Math.random() * 5),
          humidity: 50 + (Math.random() * 20),
        }
      });
    }
  }

  // 2. Garbage Bins
  console.log("Seeding Garbage Bins...");
  for (const zone of zones) {
    for (let i = 1; i <= 5; i++) {
      const id = `bin-${zone.id}-${i}`;
      await prisma.garbageBin.upsert({
        where: { id },
        update: {},
        create: {
          id,
          zoneId: zone.id,
          lat: zone.boundary.coordinates[0][0][1] - (Math.random() * 0.01),
          lng: zone.boundary.coordinates[0][0][0] - (Math.random() * 0.01),
          fillPercentage: Math.floor(Math.random() * 100),
          status: Math.random() > 0.9 ? 'overflowing' : 'ok',
        }
      });
    }
  }

  // 3. Street Lights
  console.log("Seeding Street Lights...");
  for (const zone of zones) {
    for (let i = 1; i <= 10; i++) {
      const id = `light-${zone.id}-${i}`;
      await prisma.streetLight.upsert({
        where: { id },
        update: {},
        create: {
          id,
          zoneId: zone.id,
          lat: zone.boundary.coordinates[0][0][1] + (Math.random() * 0.02 - 0.01),
          lng: zone.boundary.coordinates[0][0][0] + (Math.random() * 0.02 - 0.01),
          powerConsumption: 100 + (Math.random() * 50),
          dimmingLevel: 100,
          status: Math.random() > 0.95 ? 'fault' : 'online',
        }
      });
    }
  }

  // 4. Public Vehicles
  console.log("Seeding Public Vehicles (Buses)...");
  for (let i = 1; i <= 10; i++) {
    const id = `bus-mtc-${i}`;
    await prisma.publicVehicle.upsert({
      where: { id },
      update: {},
      create: {
        id,
        type: 'bus',
        routeId: `Route-${21 + i}`,
        lat: 13.0 + Math.random() * 0.1,
        lng: 80.2 + Math.random() * 0.1,
        speed: 15 + Math.floor(Math.random() * 30),
        occupancy: Math.floor(Math.random() * 100),
        status: Math.random() > 0.8 ? 'delayed' : 'active',
      }
    });
  }

  // 5. City Events (Historical timeline for the new LiveEventStream)
  console.log("Cleaning up old demo events...");
  await prisma.cityEvent.deleteMany({
    where: { description: { startsWith: '[DEMO]' } }
  });

  console.log("Seeding historical City Events...");
  const events = [];
  const eventTypes = [
    { type: 'TRAFFIC', severity: 'MEDIUM', text: 'Moderate congestion detected at junction.' },
    { type: 'ENVIRONMENT', severity: 'LOW', text: 'AQI within normal ranges.' },
    { type: 'WATER', severity: 'HIGH', text: 'Water level threshold exceeded.' },
    { type: 'CCTV', severity: 'MEDIUM', text: 'Vehicle stopped in active lane.' },
    { type: 'EMERGENCY', severity: 'CRITICAL', text: 'Medical emergency reported, unit dispatched.' },
    { type: 'WASTE', severity: 'LOW', text: 'Multiple bins marked as overflowing.' }
  ];

  // Generate 25 recent historical events
  for (let i = 0; i < 25; i++) {
    const ev = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    const zone = zones[Math.floor(Math.random() * zones.length)];
    
    events.push({
      type: ev.type,
      severity: ev.severity,
      description: `[DEMO] ${ev.text}`,
      zoneId: zone.id,
      source: 'system',
      status: 'active',
      // Scatter over the last 2 hours
      timestamp: new Date(now - (Math.random() * 120 * 60000))
    });
  }

  await prisma.cityEvent.createMany({
    data: events
  });

  console.log("Advanced Phase 1 City Seed completed successfully.");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
