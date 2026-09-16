const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe('DELETE FROM "_prisma_migrations"');
  console.log('Cleared migrations table');
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
