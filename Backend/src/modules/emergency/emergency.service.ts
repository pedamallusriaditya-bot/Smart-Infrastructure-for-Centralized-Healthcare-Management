import { prisma } from '../../lib/prisma.js';
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
  async createEmergencyIncident(userId: string, data: { description: string }) {
    const patient = await prisma.patient.findUnique({ where: { userId } });
    if (!patient) throw new Error('PATIENT_NOT_FOUND');

    return prisma.$transaction(async (tx) => {
      const emergency = await tx.emergency.create({
        data: {
          patientId: patient.id,
          description: data.description,
          status: 'ACTIVE'
        }
      });

      // Notify available staff (logic placeholder)
      return emergency;
    });
  }

  async resolveEmergency(emergencyId: string) {
    const incident = await prisma.emergency.findUnique({ where: { id: emergencyId } });
    if (!incident) throw new Error('Emergency not found');
    if (incident.status === 'RESOLVED') throw new Error('ALREADY_RESOLVED');

    return prisma.emergency.update({
      where: { id: emergencyId },
      data: { status: 'RESOLVED' }
    });
  }

  async getActiveStaff() {
    return prisma.emergencyStaff.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, firstName: true, lastName: true, shiftInfo: true }
    });
  }
}