import { PrismaClient, BedStatus, AdmissionStatus, AppointmentStatus, LabCategory, LabPriority, LabTestStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables from the Backend directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("❌ DATABASE_URL is not set in environment.");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("✨ Seeding clinical dashboard test patient data...");

  // 1. Ensure Roles exist
  const adminRole = await prisma.role.upsert({ where: { name: 'ADMIN' }, update: {}, create: { name: 'ADMIN' } });
  const doctorRole = await prisma.role.upsert({ where: { name: 'DOCTOR' }, update: {}, create: { name: 'DOCTOR' } });
  const patientRole = await prisma.role.upsert({ where: { name: 'PATIENT' }, update: {}, create: { name: 'PATIENT' } });
  const techRole = await prisma.role.upsert({ where: { name: 'LAB_TECHNICIAN' }, update: {}, create: { name: 'LAB_TECHNICIAN' } });

  // 2. Setup Hospital & Department
  const hospital = await prisma.hospital.upsert({
    where: { id: '4f9e66ab-0241-40b6-b033-58953b7661f0' },
    update: {},
    create: {
      id: '4f9e66ab-0241-40b6-b033-58953b7661f0',
      name: 'St. Mary\'s General Hospital',
      address: '100 Medical Plaza, San Francisco, CA'
    }
  });

  const department = await prisma.department.upsert({
    where: { id: '6b8e66ab-0241-40b6-b033-58953b7661f1' },
    update: {},
    create: {
      id: '6b8e66ab-0241-40b6-b033-58953b7661f1',
      name: 'Cardiology',
      hospitalId: hospital.id
    }
  });

  // 3. Create Doctor: Dr. Sarah Chen
  const docPassword = await bcrypt.hash('Password@123', 12);
  const docUser = await prisma.user.upsert({
    where: { email: 'sarah.chen@carehive.med' },
    update: {},
    create: {
      email: 'sarah.chen@carehive.med',
      passwordHash: docPassword,
      roleId: doctorRole.id
    }
  });

  const doctor = await prisma.doctor.upsert({
    where: { userId: docUser.id },
    update: {},
    create: {
      userId: docUser.id,
      firstName: 'Sarah',
      lastName: 'Chen',
      specialization: 'CARDIOLOGY',
      licenseNumber: 'LIC-77291-CA',
      departmentId: department.id,
      approvalStatus: 'APPROVED',
      status: 'ACTIVE'
    }
  });

  // 4. Create Lab Technician (to fulfill reports)
  const techUser = await prisma.user.upsert({
    where: { email: 'lab.tech@carehive.med' },
    update: {},
    create: {
      email: 'lab.tech@carehive.med',
      passwordHash: docPassword,
      roleId: techRole.id
    }
  });

  const technician = await prisma.labTechnician.upsert({
    where: { userId: techUser.id },
    update: {},
    create: {
      userId: techUser.id,
      firstName: 'Alex',
      lastName: 'Russo',
      employeeId: 'EMP-LT-1002'
    }
  });

  // 5. Create Patient: John Doe
  const patientPassword = await bcrypt.hash('Password@123', 12);
  const patUser = await prisma.user.upsert({
    where: { email: 'john.doe@example.com' },
    update: {},
    create: {
      email: 'john.doe@example.com',
      passwordHash: patientPassword,
      roleId: patientRole.id
    }
  });

  const patient = await prisma.patient.upsert({
    where: { userId: patUser.id },
    update: {},
    create: {
      userId: patUser.id,
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: new Date('1985-06-15T00:00:00Z'),
      gender: 'MALE',
      phone: '+1-555-0199',
      address: '742 Evergreen Terrace, Springfield',
      bloodGroup: 'O_POSITIVE',
      insuranceNumber: 'INS-88772-XYZ'
    }
  });

  // Clean old diagnostic data for clean state
  await prisma.admission.deleteMany({ where: { patientId: patient.id } });
  await prisma.appointment.deleteMany({ where: { patientId: patient.id } });
  await prisma.labOrder.deleteMany({ where: { patientId: patient.id } });
  await prisma.medicalRecord.deleteMany({ where: { patientId: patient.id } });
  await prisma.patientTimeline.deleteMany({ where: { patientId: patient.id } });

  // 6. Setup Inpatient Admission Structure
  const room = await prisma.room.create({
    data: {
      roomNumber: 'ICU-302',
      type: 'ICU',
      hospitalId: hospital.id
    }
  });

  const bed = await prisma.bed.create({
    data: {
      bedNumber: 'Bed-A',
      status: BedStatus.OCCUPIED,
      roomId: room.id
    }
  });

  await prisma.admission.create({
    data: {
      patientId: patient.id,
      doctorId: doctor.id,
      bedId: bed.id,
      status: AdmissionStatus.ADMITTED,
      reason: 'Inpatient ICU post-op observation & cardiac rhythm monitoring'
    }
  });

  // 7. Setup Appointments
  // Upcoming Appointment
  const upcomingAppt = await prisma.appointment.create({
    data: {
      patientId: patient.id,
      doctorId: doctor.id,
      appointmentDate: new Date('2026-10-24T09:30:00Z'),
      reason: 'Standard post-op cardiology checkup and follow-up consultation',
      status: AppointmentStatus.SCHEDULED
    }
  });

  // Past Assessment Appointment
  const pastAppt = await prisma.appointment.create({
    data: {
      patientId: patient.id,
      doctorId: doctor.id,
      appointmentDate: new Date('2026-06-12T10:00:00Z'),
      reason: 'Initial Assessment & ECG Diagnostics',
      status: AppointmentStatus.COMPLETED,
      notes: 'Patient reported moderate fatigue. ECG records demonstrate normal sinus rhythm. Advised hydration and moderate walking.'
    }
  });

  // 8. Setup Lab Orders & Lab Reports
  const labOrder = await prisma.labOrder.create({
    data: {
      patientId: patient.id,
      doctorId: doctor.id,
      appointmentId: pastAppt.id,
      testName: 'Complete Blood Count (CBC)',
      category: LabCategory.HEMATOLOGY,
      priority: LabPriority.ROUTINE,
      clinicalNotes: 'Screening for anemia and leukocyte count checks.',
      status: LabTestStatus.VERIFIED
    }
  });

  const labReport = await prisma.labReport.create({
    data: {
      labOrderId: labOrder.id,
      technicianId: technician.id,
      sampleId: 'SMP-99281',
      resultsData: { glucose: '95 mg/dL', a1c: '5.4%', cholesterol: '185 mg/dL' },
      fileUrl: 'https://carehive.med/reports/cbc-john-doe.pdf',
      aiSummary: 'Complete blood count indices reside within normal reference constraints. HbA1c is stable at 5.4%, indicating robust glycemic maintenance.',
      isAbnormal: false,
      doctorRemarks: 'No action required. Continue typical lifestyle regimen.'
    }
  });

  // 9. Add Medical Record Entry for Unified Patient longitudinal file
  await prisma.medicalRecord.create({
    data: {
      patientId: patient.id,
      doctorId: doctor.id,
      diagnosis: 'Normal Sinus Rhythm & Stable Hematology',
      notes: 'Clinical evaluation verifies stable post-operative progress. Cardiovascular dynamics normal.',
      attachments: 'https://carehive.med/reports/cbc-john-doe.pdf'
    }
  });

  // 10. Populate Patient Timeline Events Chronologically
  await prisma.patientTimeline.create({
    data: {
      patientId: patient.id,
      eventType: 'ADMISSION',
      description: 'Admitted to ICU Room ICU-302, Bed Bed-A by Dr. Chen for post-op monitoring.'
    }
  });

  await prisma.patientTimeline.create({
    data: {
      patientId: patient.id,
      eventType: 'APPOINTMENT',
      description: 'Consultation: Initial Assessment completed by Dr. Chen.'
    }
  });

  await prisma.patientTimeline.create({
    data: {
      patientId: patient.id,
      eventType: 'LAB_ORDER',
      description: 'Laboratory Analysis: CBC order completed and verified.'
    }
  });

  console.log("✅ CLINICAL TEST DATA POPULATED SUCCESSFULLY!");
  console.log("--------------------------------------------------");
  console.log("PATIENT LOGIN DETAILS:");
  console.log(`Email: john.doe@example.com`);
  console.log(`Password: Password@123`);
  console.log("--------------------------------------------------");
}

main()
  .catch((e) => console.error("❌ Seeding failed:", e))
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
