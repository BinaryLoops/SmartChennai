const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
async function main() {
    const cam = await prisma.cCTVFeed.findFirst();
    console.log(cam.id);
    await fetch(`http://localhost:3000/api/cctv/analysis/${cam.id}`, { method: "POST" })
      .then(r => r.json())
      .then(d => {
         console.log(JSON.stringify(d, null, 2));
      })
      .catch(e => console.error(e));
}
main().finally(() => prisma.$disconnect());
