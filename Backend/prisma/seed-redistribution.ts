import { PrismaClient, HospitalStatus, Specialization, ApprovalStatus, StaffStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

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
  console.log("✨ Seeding complementary dataset for redistribution testing...");

  const centralHospitalId = '4f9e66ab-0241-40b6-b033-58953b7661f0';
  const metroHospitalId = 'b4c8038b-82a1-43e6-acbe-630cd71424ad';

  // 1. Ensure Central Care Hospital has correct attributes and coordinates
  await prisma.hospital.upsert({
    where: { id: centralHospitalId },
    update: {
      latitude: 37.33182,
      longitude: -122.03118,
      status: 'ACTIVE',
      ambulancesCount: 2 // Set low so we can transfer to it
    },
    create: {
      id: centralHospitalId,
      name: 'Central Care Hospital',
      address: '1 Infinite Loop, Cupertino, CA',
      type: 'Private',
      district: 'Cupertino',
      state: 'CA',
      pincode: '95014',
      email: 'central@carehive.med',
      status: 'ACTIVE',
      latitude: 37.33182,
      longitude: -122.03118,
      ambulancesCount: 2
    }
  });

  // 2. Create Metro General Hospital in the same district
  await prisma.hospital.upsert({
    where: { id: metroHospitalId },
    update: {
      latitude: 37.322997,
      longitude: -122.032182,
      status: 'ACTIVE',
      ambulancesCount: 8 // Excess ambulances
    },
    create: {
      id: metroHospitalId,
      name: 'Metro General Hospital',
      address: '10100 N De Anza Blvd, Cupertino, CA',
      type: 'District Hospital',
      district: 'Cupertino',
      state: 'CA',
      pincode: '95014',
      email: 'metro@carehive.med',
      status: 'ACTIVE',
      latitude: 37.322997,
      longitude: -122.032182,
      ambulancesCount: 8
    }
  });

  // 3. Setup departments for Metro General
  const depts = ['Cardiology', 'General Physician', 'Emergency Medicine', 'Pediatrics'];
  const deptMap: Record<string, string> = {};

  for (const name of depts) {
    let d = await prisma.department.findFirst({
      where: { hospitalId: metroHospitalId, name }
    });
    if (!d) {
      d = await prisma.department.create({
        data: {
          id: name === 'Cardiology' ? '7b8e66ab-0241-40b6-b033-58953b7661f2' : undefined,
          name,
          hospitalId: metroHospitalId
        }
      });
    }
    deptMap[name] = d.id;
  }

  // 4. Seed Inventory for Central Care (Complementary dataset)
  // Excess Paracetamol, shortage of Blood and Ventilators
  const centralInventory = [
    { category: 'MEDICINE', name: 'Paracetamol 500mg', quantity: 900, minQuantity: 200, unit: 'tablets' },
    { category: 'BLOOD_UNIT', name: 'O-Negative Blood', quantity: 2, minQuantity: 15, unit: 'units' },
    { category: 'EQUIPMENT', name: 'Ventilator model X', quantity: 1, minQuantity: 3, unit: 'units' }
  ];

  for (const item of centralInventory) {
    await prisma.inventoryItem.deleteMany({
      where: { hospitalId: centralHospitalId, category: item.category as any, name: item.name }
    });
    await prisma.inventoryItem.create({
      data: {
        hospitalId: centralHospitalId,
        category: item.category as any,
        name: item.name,
        quantity: item.quantity,
        minQuantity: item.minQuantity,
        unit: item.unit
      }
    });
  }

  // 5. Seed Inventory for Metro General
  // Shortage of Paracetamol, excess Blood and Ventilators
  const metroInventory = [
    { category: 'MEDICINE', name: 'Paracetamol 500mg', quantity: 35, minQuantity: 200, unit: 'tablets' },
    { category: 'BLOOD_UNIT', name: 'O-Negative Blood', quantity: 30, minQuantity: 15, unit: 'units' },
    { category: 'EQUIPMENT', name: 'Ventilator model X', quantity: 12, minQuantity: 3, unit: 'units' }
  ];

  for (const item of metroInventory) {
    await prisma.inventoryItem.deleteMany({
      where: { hospitalId: metroHospitalId, category: item.category as any, name: item.name }
    });
    await prisma.inventoryItem.create({
      data: {
        hospitalId: metroHospitalId,
        category: item.category as any,
        name: item.name,
        quantity: item.quantity,
        minQuantity: item.minQuantity,
        unit: item.unit
      }
    });
  }

  // 6. Seed a General Physician doctor in Metro General for Doctor transfers
  const doctorRoleId = (await prisma.role.findUnique({ where: { name: 'DOCTOR' } }))?.id;
  if (doctorRoleId) {
    const docEmail = 'doctor.metro.gp@carehive.med';
    const user = await prisma.user.upsert({
      where: { email: docEmail },
      update: { status: 'ACTIVE' },
      create: {
        email: docEmail,
        passwordHash: '$2a$12$K1r.mZ3C6gX.d/wPpxp9sOPQ51Vd0w8oE2y3gNnI7r73c71Q/3wG2', // Password@123
        roleId: doctorRoleId,
        status: 'ACTIVE'
      }
    });

    await prisma.doctor.upsert({
      where: { userId: user.id },
      update: { departmentId: deptMap['General Physician'], status: 'ACTIVE' },
      create: {
        userId: user.id,
        firstName: 'John',
        lastName: 'Metro GP',
        specialization: Specialization.GENERAL_MEDICINE,
        licenseNumber: 'LIC-METRO-GP-001',
        departmentId: deptMap['General Physician'],
        approvalStatus: ApprovalStatus.APPROVED,
        status: StaffStatus.ACTIVE
      }
    });
  }

  // 7. Seed Nurse in Central Care to enable Nurse transfer testing
  const nurseRoleId = (await prisma.role.findUnique({ where: { name: 'NURSE' } }))?.id;
  if (nurseRoleId) {
    const nurseEmail = 'nurse.central@carehive.med';
    const user = await prisma.user.upsert({
      where: { email: nurseEmail },
      update: { status: 'ACTIVE' },
      create: {
        email: nurseEmail,
        passwordHash: '$2a$12$K1r.mZ3C6gX.d/wPpxp9sOPQ51Vd0w8oE2y3gNnI7r73c71Q/3wG2',
        roleId: nurseRoleId,
        status: 'ACTIVE'
      }
    });

    const centralDept = await prisma.department.findFirst({
      where: { hospitalId: centralHospitalId }
    });

    await prisma.nurse.upsert({
      where: { userId: user.id },
      update: { hospitalId: centralHospitalId, status: StaffStatus.ACTIVE },
      create: {
        userId: user.id,
        firstName: 'Sarah',
        lastName: 'Central Nurse',
        employeeId: 'EMP-CENTRAL-N-001',
        hospitalId: centralHospitalId,
        wardId: centralDept ? centralDept.id : undefined,
        status: StaffStatus.ACTIVE
      }
    });
  }

  console.log("✅ Complementary redistribution test dataset seeded successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
