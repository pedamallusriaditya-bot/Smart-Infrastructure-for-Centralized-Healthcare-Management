import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcryptjs';

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('✨ Resetting and Seeding with Valid RFC UUIDs...');

  // 1. VALID UUIDs (Version 4 compliant)
  const hospitalId = '4f9e66ab-0241-40b6-b033-58953b7661f0';
  const cardiologyId = '6b8e66ab-0241-40b6-b033-58953b7661f1';

  // 2. Setup Hospital
  const hospital = await prisma.hospital.upsert({
    where: { id: hospitalId },
    update: { name: 'Central Care Hospital' },
    create: {
      id: hospitalId,
      name: 'Central Care Hospital',
      address: '1 Infinite Loop, Cupertino, CA',
    }
  });

  // 3. Setup Departments
  const deptList = [
    { name: 'Cardiology', id: cardiologyId },
    { name: 'General Physician' },
    { name: 'Neurology' },
    { name: 'Pediatrics' },
    { name: 'Orthopedics' },
    { name: 'Emergency Medicine' },
    { name: 'Pulmonology' },
    { name: 'Dermatology' },
    { name: 'ENT' },
    { name: 'Ophthalmology' },
    { name: 'Gynecology' },
    { name: 'Psychiatry' },
    { name: 'Oncology' },
    { name: 'Radiology' },
    { name: 'Anesthesiology' },
    { name: 'Laboratory Technician' }
  ];

  for (const d of deptList) {
    const existing = await prisma.department.findFirst({
      where: { hospitalId: hospital.id, name: d.name }
    });
    if (!existing) {
      await prisma.department.create({
        data: {
          id: d.id || undefined,
          name: d.name,
          hospitalId: hospital.id
        }
      });
    }
  }

  // 4. Setup Roles
  const roles = ['ADMIN', 'DOCTOR', 'PATIENT'];
  const roleMap: any = {};
  for (const r of roles) {
    roleMap[r] = await prisma.role.upsert({ where: { name: r }, update: {}, create: { name: r } });
  }

  // 5. Setup Tim Cook (Admin)
  const hashedPassword = await bcrypt.hash('Admin@123', 12);
  const user = await prisma.user.upsert({
    where: { email: 'tim.cook@carehive.med' },
    update: { passwordHash: hashedPassword },
    create: {
      email: 'tim.cook@carehive.med',
      passwordHash: hashedPassword,
      roleId: roleMap['ADMIN'].id,
    }
  });

  await prisma.admin.upsert({
    where: { userId: user.id },
    update: { hospitalId: hospital.id },
    create: {
      userId: user.id,
      hospitalId: hospital.id,
      firstName: 'Tim',
      lastName: 'Cook'
    }
  });

  console.log('✅ SEED SUCCESSFUL with Valid UUIDs');
  console.log('Hospital ID:', hospitalId);
  console.log('Cardiology ID:', cardiologyId);
}

main().catch((e) => console.error(e)).finally(async () => { await prisma.$disconnect(); await pool.end(); });