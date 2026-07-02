import {
  Gender,
  RoleType,
  AppointmentStatus,
  EmergencyStatus,
  BedStatus,
  RoomType,
  NotificationType,
  StaffStatus,
  PermissionAction,
  PrismaClient,
  Prisma,
} from '@prisma/client';

import * as dotenv from 'dotenv';
dotenv.config();
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not defined.');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/* ---------------- HELPERS ---------------- */

const rand = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const range = (n: number) => Array.from({ length: n }, (_, i) => i);

const firstNames = ['John', 'Jane', 'Alex', 'Priya', 'Michael', 'Sara', 'David', 'Ananya', 'Rahul', 'Emily'];
const lastNames = ['Smith', 'Johnson', 'Brown', 'Williams', 'Jones', 'Kumar', 'Sharma', 'Verma'];
const cities = ['Hyderabad', 'Bangalore', 'Chennai', 'Mumbai', 'Delhi'];
const diseases = ['Fever', 'Diabetes', 'Hypertension', 'Asthma', 'Chest Pain', 'Infection', 'Fracture'];

const medicineList = [
  { name: 'Paracetamol', price: 10 },
  { name: 'Amoxicillin', price: 50 },
  { name: 'Ibuprofen', price: 20 },
  { name: 'Metformin', price: 30 },
];

/* ---------------- TYPES ----------------
   These mirror the shape returned by `user.create({ include: { doctor: true } }).doctor`
   and `.patient` respectively, so TypeScript can infer the array element type
   instead of falling back to `any[]`.
------------------------------------------ */

type DoctorRecord = Prisma.DoctorGetPayload<Record<string, never>>;
type PatientRecord = Prisma.PatientGetPayload<Record<string, never>>;

/* ---------------- CLEANUP (ordered to respect FK constraints) ---------------- */

async function cleanDatabase() {
  console.log('🧹 Cleaning database in dependency-safe order...');

  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.prescriptionMedicine.deleteMany().catch(() => {});
  await prisma.medicalRecord.deleteMany();
  await prisma.prescription.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.emergency.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.bed.deleteMany().catch(() => {});
  await prisma.room.deleteMany();
  await prisma.medicine.deleteMany();

  await prisma.admin.deleteMany().catch(() => {});
  await prisma.doctor.deleteMany().catch(() => {});
  await prisma.patient.deleteMany().catch(() => {});
  await prisma.labTechnician.deleteMany().catch(() => {});

  await prisma.user.deleteMany();
  await prisma.department.deleteMany();
  await prisma.hospital.deleteMany();

  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.role.deleteMany();

  console.log('✅ Cleanup complete');
}

/* ---------------- MAIN ---------------- */

async function main() {
  console.log('🔥 Starting intensive hospital simulation seed...');

  await cleanDatabase();

  const hash = await bcrypt.hash('password123', 10);

  /* ---------------- ROLES ---------------- */

  await prisma.role.createMany({
    data: Object.values(RoleType).map((role) => ({ name: role })),
    skipDuplicates: true,
  });

  const roles = await prisma.role.findMany();
  const roleMap = Object.fromEntries(roles.map((r) => [r.name, r.id]));

  /* ---------------- PERMISSIONS ---------------- */

  await prisma.permission.createMany({
    data: Object.values(PermissionAction).map((action) => ({
      name: `${action}_ALL`,
      action,
    })),
    skipDuplicates: true,
  });

  const allPermissions = await prisma.permission.findMany();

  await prisma.rolePermission.createMany({
    data: allPermissions.map((p) => ({
      roleId: roleMap.ADMIN,
      permissionId: p.id,
    })),
    skipDuplicates: true,
  });

  /* ---------------- ADMIN ---------------- */

  const admin = await prisma.user.create({
    data: {
      email: 'admin@system.com',
      passwordHash: hash,
      roleId: roleMap.ADMIN,
      admin: {
        create: {
          firstName: 'System',
          lastName: 'Admin',
        },
      },
    },
  });

  /* =====================================================
     🏥 MULTI-HOSPITAL SIMULATION ENGINE
  ===================================================== */

  for (let h = 0; h < 3; h++) {
    const hospital = await prisma.hospital.create({
      data: {
        name: `City Hospital ${h + 1}`,
        address: rand(cities),
        phone: `90000${h}000`,
      },
    });

    /* ---------------- DEPARTMENTS (bulk) ---------------- */

    await prisma.department.createMany({
      data: ['Cardiology', 'Neurology', 'Orthopedics'].map((name) => ({
        name,
        hospitalId: hospital.id,
      })),
    });

    const departments = await prisma.department.findMany({
      where: { hospitalId: hospital.id },
    });

    /* ---------------- ROOMS (bulk) + BEDS (bulk) ---------------- */

    await prisma.room.createMany({
      data: range(5).map((r) => ({
        roomNumber: `${100 + r}`,
        type: rand(Object.values(RoomType)),
        hospitalId: hospital.id,
      })),
    });

    const rooms = await prisma.room.findMany({ where: { hospitalId: hospital.id } });

    const bedData = rooms.flatMap((room, r) =>
      range(3).map((b) => ({
        bedNumber: `B-${r}-${b}-${room.id.slice(0, 4)}`,
        status: rand(Object.values(BedStatus)),
        roomId: room.id,
      }))
    );

    await prisma.bed.createMany({ data: bedData });

    /* ---------------- DOCTORS ----------------
       Doctor profile requires a parent User row (1:1), so these
       must remain individual creates.
    ---------------------------------------------- */

    const doctors: DoctorRecord[] = [];

    for (let d = 0; d < 5; d++) {
      const doctor = await prisma.user.create({
        data: {
          email: `doctor${h}_${d}@mail.com`,
          passwordHash: hash,
          roleId: roleMap.DOCTOR,
          doctor: {
            create: {
              firstName: rand(firstNames),
              lastName: rand(lastNames),
              specialization: rand(['Cardiology', 'Neurology', 'Orthopedics']),
              licenseNumber: `LIC-${h}${d}-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
              departmentId: departments[d % departments.length].id,
              status: rand(Object.values(StaffStatus)),
            },
          },
        },
        include: { doctor: true },
      });

      doctors.push(doctor.doctor!);
    }

    /* ---------------- LAB TECHS ---------------- */

    for (let i = 0; i < 2; i++) {
      await prisma.user.create({
        data: {
          email: `lab${h}_${i}@mail.com`,
          passwordHash: hash,
          roleId: roleMap.LAB_TECHNICIAN,
          labTechnician: {
            create: {
              firstName: rand(firstNames),
              lastName: rand(lastNames),
              employeeId: `LAB-${h}${i}-${Date.now()}`,
            },
          },
        },
      });
    }

    /* ---------------- PATIENTS ---------------- */

    const patients: PatientRecord[] = [];

    for (let p = 0; p < 50; p++) {
      const user = await prisma.user.create({
        data: {
          email: `patient${h}_${p}@mail.com`,
          passwordHash: hash,
          roleId: roleMap.PATIENT,
          patient: {
            create: {
              firstName: rand(firstNames),
              lastName: rand(lastNames),
              dateOfBirth: new Date(1980 + Math.floor(Math.random() * 30), 1, 1),
              gender: rand(Object.values(Gender)),
              phone: `98${Math.floor(10000000 + Math.random() * 9999999)}`,
              address: rand(cities),
              bloodGroup: rand(['A+', 'B+', 'O+', 'AB+']),
            },
          },
        },
        include: { patient: true },
      });

      patients.push(user.patient!);
    }

    /* ---------------- APPOINTMENTS (bulk) ---------------- */

    await prisma.appointment.createMany({
      data: patients.map((patient) => ({
        patientId: patient.id,
        doctorId: rand(doctors).id,
        appointmentDate: new Date(Date.now() + Math.random() * 10 * 86400000),
        reason: rand(diseases),
        status: rand(Object.values(AppointmentStatus)),
      })),
    });

    /* ---------------- EMERGENCIES (bulk) ---------------- */

    await prisma.emergency.createMany({
      data: range(10).map(() => ({
        patientId: rand(patients).id,
        hospitalId: hospital.id,
        status: rand(Object.values(EmergencyStatus)),
        description: `Emergency: ${rand(diseases)}`,
      })),
    });

    /* ---------------- MEDICINES (bulk) ---------------- */

    await prisma.medicine.createMany({
      data: medicineList.map((m) => ({
        name: `${m.name}-${h}`,
        manufacturer: 'Global Pharma',
        stock: 100,
        price: m.price,
      })),
    });

    const meds = await prisma.medicine.findMany({
      where: { name: { endsWith: `-${h}` } },
    });

    /* ---------------- PRESCRIPTIONS + RECORDS ----------------
       Prescription requires a nested PrescriptionMedicine create,
       so these stay individual to preserve the relation.
    ------------------------------------------------------------ */

    const medicalRecordData: Prisma.MedicalRecordCreateManyInput[] = [];

    for (let i = 0; i < 30; i++) {
      const patient = rand(patients);
      const doctor = rand(doctors);
      const med = rand(meds);

      await prisma.prescription.create({
        data: {
          patientId: patient.id,
          doctorId: doctor.id,
          medicine: med.name,
          dosage: '500mg',
          instructions: 'After food',
          medicines: {
            create: {
              medicineId: med.id,
              quantity: Math.floor(Math.random() * 5) + 1,
            },
          },
        },
      });

      medicalRecordData.push({
        patientId: patient.id,
        doctorId: doctor.id,
        diagnosis: rand(diseases),
        notes: 'Auto-generated simulation record',
      });
    }

    await prisma.medicalRecord.createMany({ data: medicalRecordData });

    /* ---------------- INVOICES (bulk) ---------------- */

    await prisma.invoice.createMany({
      data: patients.map((patient) => ({
        patientId: patient.id,
        amount: Math.floor(Math.random() * 5000),
        paid: Math.random() > 0.5,
      })),
    });

    /* ---------------- NOTIFICATION ---------------- */

    await prisma.notification.create({
      data: {
        userId: admin.id,
        title: `Hospital ${h + 1} seeded`,
        message: 'Simulation complete',
        type: NotificationType.SYSTEM,
      },
    });
  }

  /* ---------------- AUDIT LOG ---------------- */

  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: 'SEED_COMPLETE',
      entity: 'SYSTEM',
      entityId: 'GLOBAL',
      status: 'SUCCESS',
      details: {
        mode: 'simulation',
        hospitals: 3,
      },
    },
  });

  console.log('🚀 Seed completed successfully');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });