import { prisma } from '../../lib/prisma.js';
import { Specialization, StaffStatus } from '@prisma/client';
import { logger } from '../../lib/logger.js';

export class DoctorService {
  /**
   * Fetches the doctor's specific clinical profile.
   */
  async getDoctorProfileByUserId(userId: string, requestId: string) {
    const doctor = await prisma.doctor.findUnique({
      where: { userId },
      include: {
        department: { select: { id: true, name: true } },
        user: { select: { email: true } },
        _count: { select: { appointments: true } }
      }
    });

    if (!doctor) {
      logger.warn("Profile retrieval failed: Doctor record missing", { requestId, userId });
      throw new Error('DOCTOR_NOT_FOUND');
    }

    return doctor;
  }

  /**
   * Updates clinical data. Enforces immutability for critical credentials.
   */
  async updateDoctorProfile(userId: string, updateData: any, requestId: string) {
    const currentDoctor = await prisma.doctor.findUnique({ where: { userId } });
    if (!currentDoctor) {
      logger.error("Update failed: Target doctor not found", { requestId, userId });
      throw new Error('DOCTOR_NOT_FOUND');
    }

    // IDENTITY SECURITY: Strip licenseNumber from update payload if it somehow passed validation
    const { licenseNumber, ...safeData } = updateData;

    if (safeData.departmentId) {
      const deptExists = await prisma.department.findUnique({
        where: { id: safeData.departmentId }
      });
      if (!deptExists) {
        logger.warn("Department link failed: Invalid ID", { requestId, departmentId: safeData.departmentId });
        throw new Error('INVALID_DEPARTMENT');
      }
    }

    const updated = await prisma.doctor.update({
      where: { userId },
      data: safeData,
      include: { department: { select: { name: true } } }
    });

    logger.info("Doctor profile successfully updated", { requestId, userId, fields: Object.keys(safeData) });
    return updated;
  }

  /**
   * Global directory fetch for scheduling and patient portal.
   */
  async getAllDoctors(filters: { specialization?: Specialization, skip: number, take: number }, requestId: string) {
    const doctors = await prisma.doctor.findMany({
      where: {
        specialization: filters.specialization,
        status: 'ACTIVE' as StaffStatus // Healthcare Rule: only show active staff in listing
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        specialization: true,
        licenseNumber: true,
        department: { select: { name: true } }
      },
      skip: filters.skip,
      take: filters.take,
      orderBy: { lastName: 'asc' }
    });

    logger.info("Retrieved active doctor list", { requestId, count: doctors.length, filter: filters.specialization });
    return doctors;
  }

  /**
   * Critical analytics for admin resource management.
   */
  async calculateWorkload(doctorId: string, requestId: string) {
    const doctorExists = await prisma.doctor.findUnique({ where: { id: doctorId } });
    if (!doctorExists) {
      logger.error("Analytics failed: Target ID missing", { requestId, doctorId });
      throw new Error('DOCTOR_NOT_FOUND');
    }

    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setUTCHours(23, 59, 59, 999);

    const appointments = await prisma.appointment.findMany({
      where: {
        doctorId,
        appointmentDate: { gte: startOfDay, lte: endOfDay }
      }
    });

    // Logging the successful generation for auditing
    logger.info("Doctor workload metrics calculated", { 
        requestId, 
        doctorId, 
        appointmentsCount: appointments.length 
    });

    return {
      doctorId,
      count: appointments.length,
      indicator: appointments.length > 20 ? 'HIGH' : appointments.length > 10 ? 'MEDIUM' : 'LOW',
      generatedAt: new Date().toISOString()
    };
  }
}