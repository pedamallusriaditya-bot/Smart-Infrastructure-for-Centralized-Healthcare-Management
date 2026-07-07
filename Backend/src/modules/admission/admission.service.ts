import { prisma } from '../../lib/prisma.js';
import { BedStatus, AdmissionStatus } from '@prisma/client';
import { logger } from '../../lib/logger.js';
import { writeAuditLog } from '../../utils/auditHelper.js';

export class AdmissionService {
  /**
   * Logic: Move patient from Consultation to Inpatient status
   */
  async admitPatient(doctorId: string, patientId: string, bedId: string, reason: string, requestId: string) {
    // 1. Resolve Doctor ID from Doctor User ID
    const doctor = await prisma.doctor.findUnique({
      where: { userId: doctorId }
    });
    if (!doctor) throw new Error("DOCTOR_NOT_FOUND");

    return await prisma.$transaction(async (tx) => {
      // 2. Verify Bed Availability
      const bed = await tx.bed.findUnique({ where: { id: bedId } });
      if (!bed || bed.status !== BedStatus.AVAILABLE) {
        throw new Error("BED_NOT_AVAILABLE");
      }

      // 3. Check if patient is already admitted elsewhere
      const activeAdmission = await tx.admission.findFirst({
        where: { patientId, status: AdmissionStatus.ADMITTED }
      });
      if (activeAdmission) throw new Error("PATIENT_ALREADY_ADMITTED");

      // 4. Create the Admission Entry
      const admission = await tx.admission.create({
        data: {
          patientId,
          doctorId: doctor.id,
          bedId,
          reason,
          status: AdmissionStatus.ADMITTED
        }
      });

      // 5. Set physical bed to Occupied
      await tx.bed.update({
        where: { id: bedId },
        data: { status: BedStatus.OCCUPIED }
      });

      // 6. Logic: Automatically add to Patient Timeline
      await tx.patientTimeline.create({
        data: {
          patientId,
          eventType: 'ADMISSION',
          description: `Patient admitted by Dr. ${doctor.lastName} for: ${reason}. Assigned Bed: ${bed.bedNumber}`,
        }
      });

      logger.info("Clinical: Patient admitted", { requestId, admissionId: admission.id, bedId });
      
      // Write audit log
      await writeAuditLog(
        doctorId,
        'ADMIT_PATIENT',
        'Admission',
        admission.id,
        null,
        admission
      );

      return admission;
    });
  }

  /**
   * Logic: Discharge patient and free up hospital resources
   */
  async dischargePatient(admissionId: string, requestId: string) {
    const admission = await prisma.admission.findUnique({
      where: { id: admissionId },
      include: { bed: true, doctor: true }
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

      // Write audit log
      await writeAuditLog(
        admission.doctor?.userId || null,
        'DISCHARGE_PATIENT',
        'Admission',
        admissionId,
        admission,
        updated
      );

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