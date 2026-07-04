import { prisma } from '../../lib/prisma.js';
import { BedStatus, AdmissionStatus } from '@prisma/client';
import { logger } from '../../lib/logger.js';

export class AdmissionService {
  /**
   * Logic: Move patient from Consultation to Inpatient status
   */
  async admitPatient(doctorId: string, patientId: string, bedId: string, reason: string, requestId: string) {
    return await prisma.$transaction(async (tx) => {
      // 1. Verify Bed Availability
      const bed = await tx.bed.findUnique({ where: { id: bedId } });
      if (!bed || bed.status !== BedStatus.AVAILABLE) {
        throw new Error("BED_NOT_AVAILABLE");
      }

      // 2. Check if patient is already admitted elsewhere
      const activeAdmission = await tx.admission.findFirst({
        where: { patientId, status: AdmissionStatus.ADMITTED }
      });
      if (activeAdmission) throw new Error("PATIENT_ALREADY_ADMITTED");

      // 3. Create the Admission Entry
      const admission = await tx.admission.create({
        data: {
          patientId,
          doctorId,
          bedId,
          reason,
          status: AdmissionStatus.ADMITTED
        }
      });

      // 4. Set physical bed to Occupied
      await tx.bed.update({
        where: { id: bedId },
        data: { status: BedStatus.OCCUPIED }
      });

      // 5. Logic: Automatically add to Patient Timeline
      await tx.patientTimeline.create({
        data: {
          patientId,
          eventType: 'ADMISSION',
          description: `Patient admitted by Dr. for: ${reason}. Assigned Bed: ${bed.bedNumber}`,
        }
      });

      logger.info("Clinical: Patient admitted", { requestId, admissionId: admission.id, bedId });
      return admission;
    });
  }

  /**
   * Logic: Discharge patient and free up hospital resources
   */
  async dischargePatient(admissionId: string, requestId: string) {
    const admission = await prisma.admission.findUnique({
      where: { id: admissionId },
      include: { bed: true }
    });

    if (!admission || admission.status === AdmissionStatus.DISCHARGED) {
      throw new Error("ADMISSION_RECORD_NOT_ACTIVE");
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Update record
      const updated = await tx.admission.update({
        where: { id: admissionId },
        data: {
          status: AdmissionStatus.DISCHARGED,
          dischargeDate: new Date()
        }
      });

      // 2. Clean up Bed
      await tx.bed.update({
        where: { id: admission.bedId },
        data: { status: BedStatus.AVAILABLE }
      });

      logger.info("Clinical: Patient discharged", { requestId, admissionId });
      return updated;
    });
  }

  /**
   * Helper for UI: Show current room info to the Patient
   */
  async getActiveAdmissionForPatient(patientUserId: string) {
    return prisma.admission.findFirst({
      where: { 
        patient: { userId: patientUserId }, 
        status: AdmissionStatus.ADMITTED 
      },
      include: {
        bed: { include: { room: true } },
        doctor: { select: { firstName: true, lastName: true } }
      }
    });
  }
}