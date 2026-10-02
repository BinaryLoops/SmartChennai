import { PrismaClient, PredictionRiskLevel } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding predictive snapshots...");

  const zones = await prisma.zone.findMany();
  const junctions = await prisma.junction.findMany();

  const domains = ['traffic', 'flood', 'environment', 'waste', 'energy', 'transit', 'emergency', 'citizen', 'infrastructure'];
  const metrics: Record<string, string> = {
    traffic: "congestionLevel",
    flood: "floodRisk",
    environment: "aqi",
    waste: "overflowProb",
    energy: "loadRisk",
    transit: "delay",
    emergency: "demandPressure",
    citizen: "volumeTrend",
    infrastructure: "slaBreachRisk"
  };

  const snapshots = [];
  const now = new Date();

  // Create some history over the last 48 hours
  for (let hoursAgo = 48; hoursAgo >= 1; hoursAgo -= 2) {
    const generatedAt = new Date(now.getTime() - hoursAgo * 3600 * 1000);
    
    for (const domain of domains) {
      const metric = metrics[domain];
      const riskLevel: PredictionRiskLevel = Math.random() > 0.8 ? 'HIGH' : Math.random() > 0.5 ? 'MODERATE' : 'LOW';
      
      let entityId = "citywide";
      let entityType = "global";

      if (domain === 'traffic' && junctions.length > 0) {
        entityId = junctions[Math.floor(Math.random() * junctions.length)].id;
        entityType = "junction";
      } else if (domain === 'flood' && zones.length > 0) {
        entityId = zones[Math.floor(Math.random() * zones.length)].id;
        entityType = "zone";
      }

      snapshots.push({
        domain,
        entityType,
        entityId,
        metric,
        horizonMinutes: 30,
        predictedValue: Math.random() * 100,
        confidence: 0.6 + Math.random() * 0.3,
        baselineValue: 30 + Math.random() * 20,
        trend: Math.random() > 0.5 ? "RISING" : "STABLE",
        riskLevel,
        method: "DEMO_SEED",
        factors: [{ key: "synthetic_history", label: "Synthetic History", contribution: 100, direction: "INCREASE" }],
        generatedAt,
        expiresAt: new Date(generatedAt.getTime() + 30 * 60000),
        actualValue: Math.random() * 100,
        error: Math.random() * 10
      });
    }
  }

  await prisma.predictionSnapshot.createMany({ data: snapshots as any });
  console.log(`Seeded ${snapshots.length} historical predictive snapshots.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
