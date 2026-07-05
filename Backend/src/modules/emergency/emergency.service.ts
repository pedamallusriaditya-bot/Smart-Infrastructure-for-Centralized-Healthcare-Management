import { prisma } from '../../lib/prisma.js';
import { EmergencyDispatchService } from '../../services/emergencyDispatch.service.js';


import { EmergencyStatus, StaffStatus } from '@prisma/client';

export class EmergencyService {
  /**
   * STAFF MANAGEMENT
   */
  async registerStaff(targetUserId: string, data: { firstName: string, lastName: string, shiftInfo?: string }) {
    const existing = await prisma.emergencyStaff.findUnique({ where: { userId: targetUserId } });
    if (existing) throw new Error('Emergency staff already exists');

    return prisma.emergencyStaff.create({
      data: {
        userId: targetUserId,
        firstName: data.firstName,
        lastName: data.lastName,
        shiftInfo: data.shiftInfo || 'ROTATING'
      }
    });
  }

  async updateStaffShift(id: string, requestorId: string, requestorRole: string, shiftInfo: string) {
    const staff = await prisma.emergencyStaff.findUnique({ where: { id } });
    if (!staff) throw new Error('Emergency staff not found');

    // SECURITY: Ensure user is updating themselves OR is an ADMIN
    if (requestorRole !== 'ADMIN' && staff.userId !== requestorId) {
      throw new Error('UNAUTHORIZED_SHIFT_UPDATE');
    }

    return prisma.emergencyStaff.update({
      where: { id },
      data: { shiftInfo }
    });
  }

  /**
   * INCIDENT MANAGEMENT (The actual emergencies)
   */
  async createEmergencyIncident(
    userId: string,
    data: {
      description: string,
      hospitalId?: string,
      patientLatitude?: number,
      patientLongitude?: number,
    },
  ) {
    const patient = await prisma.patient.findUnique({ where: { userId } });
    if (!patient) throw new Error('PATIENT_NOT_FOUND');

    return prisma.$transaction(async (tx) => {
      let hospitalId = data.hospitalId || null;
      if (!hospitalId) {
        const defaultHospital = await tx.hospital.findFirst();
        if (defaultHospital) hospitalId = defaultHospital.id;
      }

      const emergency = await tx.emergency.create({
        data: {
          patientId: patient.id,
          description: data.description,
          hospitalId: hospitalId || undefined,
          patientLatitude: data.patientLatitude,
          patientLongitude: data.patientLongitude,
          status: EmergencyStatus.ACTIVE,
        },
      });

      // Dispatch to nearest hospital based on coordinates
      await EmergencyDispatchService.dispatch(emergency.id);

      return emergency;
    });
  }

  async resolveEmergency(emergencyId: string) {
    const incident = await prisma.emergency.findUnique({ where: { id: emergencyId } });
    if (!incident) throw new Error('Emergency not found');
    if (incident.status === EmergencyStatus.RESOLVED) throw new Error('ALREADY_RESOLVED');

    return prisma.emergency.update({
      where: { id: emergencyId },
      data: { status: EmergencyStatus.RESOLVED }
    });
  }

  async getActiveStaff() {
    return prisma.emergencyStaff.findMany({
      where: { status: StaffStatus.ACTIVE },
      select: { id: true, firstName: true, lastName: true, shiftInfo: true }
    });
  }

  async getEmergencies(userId: string, role: string) {
    const where: any = {};
    if (role === 'ADMIN') {
      const admin = await prisma.admin.findUnique({ where: { userId } });
      if (admin) where.hospitalId = admin.hospitalId;
    } else if (role === 'DOCTOR') {
      const doctor = await prisma.doctor.findUnique({ where: { userId }, include: { department: true } });
      if (doctor) where.hospitalId = doctor.department.hospitalId;
    } else if (role === 'PATIENT') {
      const patient = await prisma.patient.findUnique({ where: { userId } });
      if (patient) where.patientId = patient.id;
    }
    return prisma.emergency.findMany({
      where,
      include: {
        patient: { select: { firstName: true, lastName: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }
}