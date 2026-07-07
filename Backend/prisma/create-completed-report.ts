import { PrismaClient, LabCategory, LabPriority, LabTestStatus } from '@prisma/client';
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

  const tech = await prisma.labTechnician.findFirst({
    where: { employeeId: 'EMP-LAB-1-1' }
  });
  if (!tech) throw new Error("Technician not found");

  const labOrder = await prisma.labOrder.create({
    data: {
      patientId: patient.id,
      doctorId: doctor.id,
      testName: 'Complete Blood Count (CBC)',
      category: LabCategory.HEMATOLOGY,
      priority: LabPriority.NORMAL,
      status: LabTestStatus.VERIFIED
    }
  });

  const labReport = await prisma.labReport.create({
    data: {
      labOrderId: labOrder.id,
      technicianId: tech.id,
      sampleId: `SMP-${Math.floor(100000 + Math.random() * 900000)}`,
      resultsData: {
        glucose: { value: "95", unit: "mg/dL", range: "70-100", remarks: "Normal" },
        cholesterol: { value: "170", unit: "mg/dL", range: "<200", remarks: "Normal" },
        hemoglobin: { value: "14.2", unit: "g/dL", range: "13.8-17.2", remarks: "Normal" },
        whiteBloodCell: { value: "6200", unit: "mcL", range: "4500-11000", remarks: "Normal" }
      },
      fileUrl: "https://carehive.med/reports/sample-report.pdf",
      isAbnormal: false,
      technicianNotes: "CBC test run completed successfully. All values align with standard baseline ranges.",
      doctorRemarks: "Physician sign-off complete. Excellent blood count profiles.",
      aiSummary: "The laboratory profile demonstrates optimal physiological ranges across all tested metrics. Glucose and cholesterol indices indicate robust metabolic health."
    }
  });

  await prisma.medicalRecord.create({
    data: {
      patientId: patient.id,
      doctorId: doctor.id,
      diagnosis: "Complete Blood Count (CBC)",
      notes: "Lab report verified and archived. Values within normal standard physiological margins."
    }
  });

  console.log(`✅ Lab Report successfully created and verified!`);
  console.log(`Patient Name: ${patient.firstName} ${patient.lastName}`);
  console.log(`Patient Email: patient.1.30@carehive.med`);
  console.log(`Test: Complete Blood Count (CBC)`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
