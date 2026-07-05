import { prisma } from '../lib/prisma.js';
import { RoleType } from '@prisma/client';

export const ownershipGuard = async (
  userId: string,
  roleType: RoleType,
  resource: { type: 'appointment' | 'patient' | 'medicalRecord', id: string }
) => {

  const logAccess = async (authorized: boolean, reason: string) => {
    await prisma.auditLog.create({
      data: {
        userId,
        action: `ACCESS_${resource.type.toUpperCase()}`,

        entity: resource.type,
        entityId: resource.id,

        details: {
          reason,
          status: authorized ? 'SUCCESS' : 'DENIED'
        }
      }
    });
  };

  // 🔐 Admin bypass
  if (roleType === RoleType.ADMIN) {
    await logAccess(true, 'Admin bypass');
    return true;
  }

  try {
    let authorized = false;

    // =========================
    // APPOINTMENT ACCESS
    // =========================
    if (resource.type === 'appointment') {
      const appointment = await prisma.appointment.findUnique({
        where: { id: resource.id },
        select: { doctorId: true, patientId: true }
      });

      if (!appointment) throw new Error('Resource not found');

      authorized =
        (roleType === RoleType.DOCTOR && appointment.doctorId === userId) ||
        (roleType === RoleType.PATIENT && appointment.patientId === userId);
    }

    // =========================
    // PATIENT ACCESS
    // =========================
    else if (resource.type === 'patient') {
      const patient = await prisma.patient.findUnique({
        where: { id: resource.id }
      });

      if (!patient) throw new Error('Resource not found');

      authorized =
        roleType === RoleType.PATIENT &&
        patient.userId === userId;
    }

    // =========================
    // MEDICAL RECORD ACCESS
    // =========================
    else if (resource.type === 'medicalRecord') {
      const record = await prisma.medicalRecord.findUnique({
        where: { id: resource.id },
        include: { patient: true }
      });

      if (!record) throw new Error('Resource not found');

      const isPatientOwner =
        roleType === RoleType.PATIENT &&
        record.patient.userId === userId;

      const hasDoctorRelationship = await prisma.appointment.findFirst({
        where: {
          patientId: record.patientId,
          doctor: { userId }
        }
      });

      const isDoctor =
        roleType === RoleType.DOCTOR && !!hasDoctorRelationship;

      authorized = isPatientOwner || isDoctor;
    }

    // =========================
    // FINAL DECISION
    // =========================
    if (!authorized) {
      await logAccess(false, 'Unauthorized access attempt');
      throw new Error(`Forbidden: You do not own this ${resource.type}`);
    }

    await logAccess(true, 'Authorized access granted');
    return true;

  } catch (error: any) {
    if (error.message.includes('Forbidden')) throw error;
    throw new Error('Access security check failed');
  }
};