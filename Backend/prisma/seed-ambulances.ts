import { PrismaClient, AmbulanceStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is missing.");
}

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding ambulances fleet...");

  // Find existing hospitals
  const hospitals = await prisma.hospital.findMany({
    where: { status: 'ACTIVE' }
  });

  if (hospitals.length === 0) {
    console.error("No active hospitals found to bind ambulances to. Run normal seed first.");
    return;
  }

  const centralCare = hospitals.find(h => h.name.includes("Central Care")) || hospitals[0];
  const metroGeneral = hospitals.find(h => h.name.includes("Metro General")) || hospitals[1] || hospitals[0];

  const ambulances = [
    {
      driverName: "Amit Sharma",
      driverPhone: "+1 408-555-0101",
      vehicleNumber: "CA-01-AM-1234",
      latitude: 37.3300,
      longitude: -122.0300,
      status: AmbulanceStatus.AVAILABLE,
      fuelLevel: 85.0,
      hospitalId: centralCare.id
    },
    {
      driverName: "Brian O'Conner",
      driverPhone: "+1 408-555-0102",
      vehicleNumber: "CA-01-AM-5678",
      latitude: 37.3330,
      longitude: -122.0320,
      status: AmbulanceStatus.AVAILABLE,
      fuelLevel: 92.0,
      hospitalId: centralCare.id
    },
    {
      driverName: "Carlos Sainz",
      driverPhone: "+1 408-555-0103",
      vehicleNumber: "CA-01-AM-9012",
      latitude: 37.3350,
      longitude: -122.0350,
      status: AmbulanceStatus.MAINTENANCE,
      fuelLevel: 12.0,
      hospitalId: centralCare.id
    },
    {
      driverName: "David Miller",
      driverPhone: "+1 408-555-0104",
      vehicleNumber: "CA-02-AM-4321",
      latitude: 37.3200,
      longitude: -122.0310,
      status: AmbulanceStatus.AVAILABLE,
      fuelLevel: 78.0,
      hospitalId: metroGeneral.id
    },
    {
      driverName: "Elena Rostova",
      driverPhone: "+1 408-555-0105",
      vehicleNumber: "CA-02-AM-8765",
      latitude: 37.3250,
      longitude: -122.0340,
      status: AmbulanceStatus.AVAILABLE,
      fuelLevel: 64.0,
      hospitalId: metroGeneral.id
    }
  ];

  for (const amb of ambulances) {
    await prisma.ambulance.upsert({
      where: { vehicleNumber: amb.vehicleNumber },
      update: {
        driverName: amb.driverName,
        driverPhone: amb.driverPhone,
        latitude: amb.latitude,
        longitude: amb.longitude,
        status: amb.status,
        fuelLevel: amb.fuelLevel,
        hospitalId: amb.hospitalId
      },
      create: amb
    });
  }

  console.log(`Successfully seeded ${ambulances.length} ambulances.`);
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
