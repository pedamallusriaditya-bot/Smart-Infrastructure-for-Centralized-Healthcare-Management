import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const nurses = await prisma.nurse.findMany({
    include: { ward: true }
  });

  console.log(`Analyzing ${nurses.length} nurses...`);

  let count = 0;
  for (const nurse of nurses) {
    if (!nurse.hospitalId && nurse.ward) {
      await prisma.nurse.update({
        where: { id: nurse.id },
        data: { hospitalId: nurse.ward.hospitalId }
      });
      count++;
    }
  }

  console.log(`✅ Successfully updated ${count} nurses to set their hospitalId!`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
