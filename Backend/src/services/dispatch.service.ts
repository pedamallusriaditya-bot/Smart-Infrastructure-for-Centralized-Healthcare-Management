// backend/src/services/dispatch.service.ts
import { prisma } from '../lib/prisma.js';
import { generateClinicalInsight } from './ai.service.js';

/**
 * Optimized helper to find a hospital with at least one free bed.
 */
const findAvailableHospital = async () => {
  const hospitals = await prisma.hospital.findMany({
    include: {
      rooms: {
        include: {
          beds: true
        }
      }
    }
  });

  return hospitals.find(h =>
    h.rooms.some(r =>
      r.beds.some(b => b.status === 'AVAILABLE')
    )
  );
};

export const initiateEmergencyDispatch = async (sosData: any) => {
  // 1. AI Severity Assessment
  const severity = await generateClinicalInsight(sosData);
  
  // 2. Find Hospital with available capacity using our nested schema
  const hospital = await findAvailableHospital();
  
  if (!hospital) {
    throw new Error("No hospitals with available beds found.");
  }

  // 3. Assign Ambulance (Mock)
  const ambulance = { id: "AMB-" + Math.floor(Math.random() * 999), status: "DISPATCHED" };
  
  // 4. Create Emergency Record (Ensure this model is in your schema)
  const emergency = await prisma.emergency.create({
    data: { 
        patientId: sosData.patientId, 
        status: 'DISPATCHED',
        hospitalId: hospital.id // Link the emergency to the found hospital
    }
  });

  return { severity, hospital, ambulance, emergency };
};