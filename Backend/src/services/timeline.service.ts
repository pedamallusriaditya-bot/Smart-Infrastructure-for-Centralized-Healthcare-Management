import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';

export class TimelineService {
  /**
   * Generates a unified chronological medical timeline for a patient.
   * Logic updated to support new LabOrder schema and entity-based auditing.
   */
  async getTimeline(patientId: string, requestId: string) {
    try {
      // 1. Concurrent fetching of all timeline-relevant entities
      const [appointments, labOrders, records] = await Promise.all([
        prisma.appointment.findMany({
          where: { patientId },
          orderBy: { appointmentDate: 'desc' }
        }),
        // STRUCTURE FIX: Changed 'labTest' to 'labOrder' to match LIS Schema
        prisma.labOrder.findMany({
          where: { patientId },
          orderBy: { createdAt: 'desc' }
        }),
        prisma.medicalRecord.findMany({
          where: { patientId },
          orderBy: { createdAt: 'desc' }
        })
      ]);

      // 2. Formatting Lab Results with explicit types to resolve 'any' warnings
      const formattedLabs = labOrders.map((lab: any) => ({
        ...lab,
        entryType: 'LAB_ORDER',
        date: lab.createdAt
      }));

      const formattedAppointments = appointments.map((appt: any) => ({
        ...appt,
        entryType: 'APPOINTMENT',
        date: appt.appointmentDate
      }));

      const formattedRecords = records.map((rec: any) => ({
        ...rec,
        entryType: 'MEDICAL_RECORD',
        date: rec.createdAt
      }));

      // 3. Merging and Sorting by date
      const combinedTimeline = [
        ...formattedLabs, 
        ...formattedAppointments, 
        ...formattedRecords
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // 4. AUDIT LOG STRUCTURE FIX: 
      // Changed 'resourceId' to 'entityId' and 'resourceType' to 'entity'
      await prisma.auditLog.create({
        data: {
          action: 'ACCESS_PATIENT_TIMELINE',
          entity: 'Patient',      // Matches 'entity' in schema
          entityId: patientId,    // Matches 'entityId' in schema (Fixes the TS Error)
          details: {
            requestId,
            itemCount: combinedTimeline.length
          }
        }
      });

      logger.info("Timeline generated successfully", { requestId, patientId });
      return combinedTimeline;

    } catch (error: any) {
      logger.error("Timeline Generation Fault", { requestId, error: error.message });
      throw error;
    }
  }
}