import { PrismaClient, AdmissionStatus, BedStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // 1. Find Gandhi Memorial Hospital
  const hospital = await prisma.hospital.findFirst({
    where: { name: 'Gandhi Memorial Hospital' }
  });
  if (!hospital) throw new Error("Hospital not found");

  // 2. Find Patient Mahesh Varma
  const patient = await prisma.patient.findFirst({
    where: { user: { email: 'patient.1.30@carehive.med' } }
  });
  if (!patient) throw new Error("Patient not found");

  // 3. Find a Doctor at Gandhi Memorial Hospital
  const doctor = await prisma.doctor.findFirst({
    where: { department: { hospitalId: hospital.id } }
  });
  if (!doctor) throw new Error("Doctor not found");

  // 4. Find an AVAILABLE Bed in a Room belonging to Gandhi Memorial Hospital
  const availableBed = await prisma.bed.findFirst({
    where: {
      status: BedStatus.AVAILABLE,
      room: { hospitalId: hospital.id }
    },
    include: { room: true }
  });
  if (!availableBed) throw new Error("No available beds in the hospital");

  // 5. Perform the admission inside a transaction
  const admission = await prisma.$transaction(async (tx) => {
    // a. Mark Bed as OCCUPIED
    await tx.bed.update({
      where: { id: availableBed.id },
      data: { status: BedStatus.OCCUPIED }
    });

    // b. Create Admission record
    return tx.admission.create({
      data: {
        patientId: patient.id,
        doctorId: doctor.id,
        bedId: availableBed.id,
        status: AdmissionStatus.ADMITTED,
        reason: "Clinical observation for diagnostic evaluation"
      }
    });
  });

  console.log(`✅ Patient Mahesh Varma successfully admitted!`);
  console.log(`Admission ID: ${admission.id}`);
  console.log(`Hospital: ${hospital.name}`);
  console.log(`Doctor: Dr. ${doctor.firstName} ${doctor.lastName}`);
  console.log(`Room Number: ${availableBed.room.roomNumber}`);
  console.log(`Bed Number: ${availableBed.bedNumber}`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
