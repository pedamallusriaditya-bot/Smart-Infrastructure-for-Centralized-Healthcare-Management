import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const nurseUser = await prisma.user.findUnique({
    where: { email: 'nurse.1.1@carehive.med' }
  });
  if (!nurseUser) throw new Error("Nurse User not found");

  const nurse = await prisma.nurse.findUnique({
    where: { userId: nurseUser.id },
    include: { hospital: true }
  });
  if (!nurse) throw new Error("Nurse not found");

  const patient = await prisma.patient.findFirst({
    where: { user: { email: 'patient.1.30@carehive.med' } }
  });
  if (!patient) throw new Error("Patient not found");

  const admission = await prisma.admission.findFirst({
    where: { patientId: patient.id, status: 'ADMITTED' },
    include: {
      bed: {
        include: {
          room: {
            include: {
              hospital: true
            }
          }
        }
      }
    }
  });

  console.log("=== Nurse ===");
  console.log(`Nurse Name: ${nurse.firstName} ${nurse.lastName}`);
  console.log(`Nurse Hospital ID: ${nurse.hospitalId}`);
  console.log(`Nurse Hospital Name: ${nurse.hospital?.name}`);
  console.log(`Nurse Ward ID: ${nurse.wardId}`);

  console.log("=== Admission ===");
  if (!admission) {
    console.log("No active admission found for Mahesh Varma!");
  } else {
    console.log(`Admission ID: ${admission.id}`);
    console.log(`Admission Status: ${admission.status}`);
    console.log(`Bed ID: ${admission.bedId}`);
    console.log(`Bed Number: ${admission.bed.bedNumber}`);
    console.log(`Room Number: ${admission.bed.room.roomNumber}`);
    console.log(`Room Hospital ID: ${admission.bed.room.hospitalId}`);
    console.log(`Room Hospital Name: ${admission.bed.room.hospital.name}`);
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
