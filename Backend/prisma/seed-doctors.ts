import { PrismaClient, Specialization, ApprovalStatus, StaffStatus } from '@prisma/client';
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

// Map department names to schema Specialization enums
const specializationMap: Record<string, Specialization> = {
  'Cardiology': Specialization.CARDIOLOGY,
  'Dermatology': Specialization.DERMATOLOGY,
  'Emergency Medicine': Specialization.EMERGENCY_MEDICINE,
  'General Medicine': Specialization.GENERAL_MEDICINE,
  'General Physician': Specialization.GENERAL_MEDICINE,
  'Neurology': Specialization.NEUROLOGY,
  'Oncology': Specialization.ONCOLOGY,
  'Pediatrics': Specialization.PEDIATRICS,
  'Psychiatry': Specialization.PSYCHIATRY,
  'Radiology': Specialization.RADIOLOGY,
  'Laboratory': Specialization.PATHOLOGY,
  'Pathology': Specialization.PATHOLOGY,
  'Laboratory Technician': Specialization.PATHOLOGY,
};

async function main() {
  console.log("✨ Seeding 15 doctors per department...");

  // 1. Get Doctor role
  const doctorRole = await prisma.role.findUnique({
    where: { name: 'DOCTOR' }
  });
  if (!doctorRole) {
    console.error("❌ DOCTOR role not found. Please run the main seed script first.");
    process.exit(1);
  }

  // 2. Get all departments
  const departments = await prisma.department.findMany();
  if (departments.length === 0) {
    console.error("❌ No departments found in database. Please seed departments first.");
    process.exit(1);
  }

  // 3. Precompute password hash
  console.log("🔑 Precomputing password hash for 'Password@123'...");
  const hashedPassword = await bcrypt.hash('Password@123', 12);
  console.log("✅ Hash precomputed.");

  const firstNames = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Linda', 'Michael', 'Susan', 'William', 'Sarah', 'David', 'Karen', 'Richard', 'Lisa', 'Thomas'];
  const lastNames = ['Smith', 'Miller', 'Davis', 'Wilson', 'Taylor', 'Anderson', 'Thomas', 'Jackson', 'White', 'Harris', 'Martin', 'Thompson', 'Garcia', 'Martinez', 'Robinson'];

  // 4. Iterate departments and create doctors
  for (const dept of departments) {
    console.log(`🏥 Department: ${dept.name} (${dept.id})`);
    
    // Check existing doctors
    const existingDoctors = await prisma.doctor.findMany({
      where: { departmentId: dept.id }
    });

    const countNeeded = 15 - existingDoctors.length;
    if (countNeeded <= 0) {
      console.log(`✅ Already has ${existingDoctors.length} doctors. Skipping.`);
      continue;
    }

    console.log(`👉 Creating ${countNeeded} doctors for department ${dept.name}...`);
    
    // Determine Specialization
    const spec = specializationMap[dept.name] || Specialization.GENERAL_MEDICINE;

    for (let i = 0; i < countNeeded; i++) {
      // Index for naming
      const docIndex = existingDoctors.length + i + 1;
      const firstName = firstNames[i % firstNames.length];
      const lastName = `${lastNames[i % lastNames.length]}-${docIndex}`;
      
      const email = `doctor.${dept.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.${docIndex}@carehive.med`;
      const license = `LIC-${dept.name.toUpperCase().replace(/[^A-Z0-9]/g, '')}-${docIndex}`;

      try {
        await prisma.$transaction(async (tx) => {
          // Check if User already exists
          let user = await tx.user.findUnique({ where: { email } });
          if (!user) {
            user = await tx.user.create({
              data: {
                email,
                passwordHash: hashedPassword,
                roleId: doctorRole.id,
                status: 'ACTIVE'
              }
            });
          }

          // Create doctor profile
          const docExisting = await tx.doctor.findUnique({ where: { userId: user.id } });
          if (!docExisting) {
            await tx.doctor.create({
              data: {
                userId: user.id,
                firstName,
                lastName,
                specialization: spec,
                licenseNumber: license,
                departmentId: dept.id,
                approvalStatus: ApprovalStatus.APPROVED,
                status: StaffStatus.ACTIVE
              }
            });
          }
        });
      } catch (err: any) {
        console.error(`❌ Failed to create doctor index ${docIndex} in ${dept.name}:`, err.message);
      }
    }
  }

  console.log("🎉 Seeding complete. All departments have 15 doctors.");
}

main()
  .catch((e) => console.error("Error executing seeder:", e))
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
