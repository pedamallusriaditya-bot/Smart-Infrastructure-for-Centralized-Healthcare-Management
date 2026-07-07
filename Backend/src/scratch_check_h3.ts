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
  // Find Apollo Community Hospital
  const hospital = await prisma.hospital.findFirst({
    where: { name: { contains: 'Apollo' } }
  });

  if (!hospital) {
    console.log("Apollo Community Hospital not found.");
    return;
  }

  console.log(`Hospital: ${hospital.name} (ID: ${hospital.id})`);

  // Count active admissions in this hospital
  const admissionsCount = await prisma.admission.count({
    where: {
      status: 'ADMITTED',
      bed: {
        room: {
          hospitalId: hospital.id
        }
      }
    }
  });

  console.log(`Active admissions count: ${admissionsCount}`);

  // Find some patients in this hospital who are NOT admitted
  const allPatients = await prisma.patient.findMany({
    where: {
      user: {
        email: {
          startsWith: 'patient.3.' // patients seeded for hospital 3
        }
      }
    },
    include: {
      admissions: true
    }
  });

  const unadmittedPatients = allPatients.filter(p => !p.admissions.some(a => a.status === 'ADMITTED'));
  console.log(`Total patients in this hospital: ${allPatients.length}`);
  console.log(`Unadmitted patients in this hospital: ${unadmittedPatients.length}`);
  if (unadmittedPatients.length > 0) {
    console.log("Example unadmitted patient:");
    console.log(`- ${unadmittedPatients[0].firstName} ${unadmittedPatients[0].lastName} (ID: ${unadmittedPatients[0].id})`);
  }

  // Find available beds in this hospital
  const availableBeds = await prisma.bed.findMany({
    where: {
      status: 'AVAILABLE',
      room: {
        hospitalId: hospital.id
      }
    },
    include: {
      room: true
    }
  });

  console.log(`Available beds count: ${availableBeds.length}`);
  if (availableBeds.length > 0) {
    console.log("Example available bed:");
    console.log(`- Bed: ${availableBeds[0].bedNumber} in Room: ${availableBeds[0].room.roomNumber}`);
  }
}

main().catch(console.error).finally(() => pool.end());
