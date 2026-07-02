import { prisma } from '../../lib/prisma.js';

interface SyncPayload {
  newPatients?: any[];
  newEmergencies?: any[];
  newVitals?: any[];
}

export class SyncService {
  async processOfflineSync(syncPayload: SyncPayload) {
    const { newPatients = [], newEmergencies = [], newVitals = [] } = syncPayload;

    const syncResult = await prisma.$transaction(async (tx) => {
      let syncedPatients = 0, syncedEmergencies = 0, syncedVitals = 0;

      for (const patient of newPatients) {
        await tx.patient.upsert({
          where: { id: patient.id },
          update: {
            firstName: patient.firstName,
            lastName: patient.lastName,
            updatedAt: new Date()
          },
          create: {
            id: patient.id,
            userId: patient.userId,
            firstName: patient.firstName,
            lastName: patient.lastName,
            dateOfBirth: new Date(patient.dateOfBirth || '2000-01-01'),
            gender: patient.gender || 'UNKNOWN'
          }
        });
        syncedPatients++;
      }

      for (const emergency of newEmergencies) {
        await tx.emergency.upsert({
          where: { id: emergency.id },
          update: { status: emergency.status },
          create: {
            id: emergency.id,
            patientId: emergency.patientId,
            status: emergency.status,
            hospitalId: emergency.hospitalId
          }
        });
        syncedEmergencies++;
      }

      for (const vital of newVitals) {
        await tx.vitalSigns.create({
          data: {
            medicalRecordId: vital.medicalRecordId,
            bloodPressure: vital.bloodPressure,
            heartRate: vital.heartRate,
            temperature: vital.temperature,
            respiratoryRate: vital.respiratoryRate,
            recordedAt: vital.recordedAt ? new Date(vital.recordedAt) : new Date()
          }
        });
        syncedVitals++;
      }

      return { syncedPatients, syncedEmergencies, syncedVitals };
    });

    return syncResult;
  }
}