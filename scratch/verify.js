const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
async function main() {
  const zones = await prisma.zone.count();
  const junctions = await prisma.junction.count();
  const cameras = await prisma.cCTVFeed.count();
  const sensors = await prisma.waterSensor.count();
  console.log(`Verified DB stats:\n- Zones: ${zones}\n- Junctions: ${junctions}\n- Cameras: ${cameras}\n- Water Sensors: ${sensors}`);
}
main().finally(() => prisma.$disconnect());
