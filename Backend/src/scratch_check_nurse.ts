import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = 'nurse.3.1@carehive.med';
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      nurse: {
        include: {
          hospital: true,
          ward: true
        }
      }
    }
  });

  if (!user) {
    console.log(`User ${email} not found.`);
    return;
  }

  console.log("User found:", JSON.stringify(user, null, 2));

  if (!user.nurse) {
    console.log("User is not associated with a Nurse profile.");
    return;
  }

  const admissions = await prisma.admission.findMany({
    where: {
      status: 'ADMITTED',
      bed: {
        room: {
          hospitalId: user.nurse.hospitalId
        }
      }
    },
    include: {
      patient: true,
      bed: {
        include: {
          room: true
        }
      }
    }
  });

  console.log(`Admissions in this nurse's hospital: ${admissions.length}`);
  for (const adm of admissions) {
    console.log(`- Patient: ${adm.patient.firstName} ${adm.patient.lastName}, Room: ${adm.bed.room.roomNumber}, Bed: ${adm.bed.bedNumber}`);
  }
}

main().catch(console.error).finally(() => pool.end());
