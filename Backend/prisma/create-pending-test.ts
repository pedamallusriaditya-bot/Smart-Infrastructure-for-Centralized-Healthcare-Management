import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const hospital = await prisma.hospital.findFirst({
    where: { name: 'Gandhi Memorial Hospital' }
  });
  if (!hospital) throw new Error("Hospital not found");

  const doctor = await prisma.doctor.findFirst({
    where: { department: { hospitalId: hospital.id } }
  });
  if (!doctor) throw new Error("Doctor not found");

  const patient = await prisma.patient.findFirst({
    where: { user: { email: 'patient.1.30@carehive.med' } }
  });
  if (!patient) throw new Error("Patient not found");

  // Delete existing ordered lab orders for this patient to prevent clutter
  await prisma.labOrder.deleteMany({
    where: {
      patientId: patient.id,
      status: 'ORDERED'
    }
  });

  const labOrder = await prisma.labOrder.create({
    data: {
      patientId: patient.id,
      doctorId: doctor.id,
      testName: 'Lipid Profile',
      category: 'BIOCHEMISTRY',
      priority: 'URGENT',
      status: 'ORDERED'
    }
  });

  await prisma.labReport.create({
    data: {
      labOrderId: labOrder.id,
      isAbnormal: false
    }
  });

  console.log(`✅ Lab Order successfully created!`);
  console.log(`Hospital: ${hospital.name}`);
  console.log(`Doctor: Dr. ${doctor.firstName} ${doctor.lastName}`);
  console.log(`Patient Name: ${patient.firstName} ${patient.lastName}`);
  console.log(`Patient Email: patient.1.30@carehive.med`);
  console.log(`Test: Lipid Profile (Priority: URGENT)`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
