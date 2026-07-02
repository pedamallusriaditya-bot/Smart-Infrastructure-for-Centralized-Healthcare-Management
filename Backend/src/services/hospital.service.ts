// backend/src/services/hospital.service.ts
import { prisma } from '../lib/prisma.js';

export const getHospitalsWithAvailability = async () => {
  const hospitals = await prisma.hospital.findMany({
    include: {
      rooms: {
        include: {
          beds: true
        }
      }
    }
  });

  return hospitals.map((hospital) => {
    let availableBeds = 0;

    hospital.rooms.forEach((room) => {
      availableBeds += room.beds.filter(
        (bed) => bed.status === 'AVAILABLE'
      ).length;
    });

    return {
      ...hospital,
      availableBedsCount: availableBeds
    };
  });
};