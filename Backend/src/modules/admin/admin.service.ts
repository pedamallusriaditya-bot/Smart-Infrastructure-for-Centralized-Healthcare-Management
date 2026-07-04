import { prisma } from '../../lib/prisma.js';
import { UserStatus, ApprovalStatus } from '@prisma/client';
import { logger } from '../../lib/logger.js';

export class AdminService {
  /**
   * Helper: Get Admin's Hospital Context
   */
  private async getAdminHospital(adminUserId: string) {
    const admin = await prisma.admin.findUnique({ where: { userId: adminUserId } });
    if (!admin || !admin.hospitalId) throw new Error("ADMIN_NOT_ASSIGNED_TO_HOSPITAL");
    return admin.hospitalId;
  }

  /**
   * Metrics scoped to the Admin's specific hospital
   */
  async getSystemMetrics(adminUserId: string, requestId: string) {
    const hospitalId = await this.getAdminHospital(adminUserId);

    const [patients, doctors, labOrders, rooms] = await Promise.all([
      prisma.patient.count({ where: { appointments: { some: { doctor: { department: { hospitalId } } } } } }),
      prisma.doctor.count({ where: { department: { hospitalId } } }),
      prisma.labOrder.count({ where: { doctor: { department: { hospitalId } } } }),
      prisma.room.findMany({
        where: { hospitalId },
        include: { beds: { select: { status: true } } }
      })
    ]);

    const totalBeds = rooms.reduce((acc, r) => acc + r.beds.length, 0);
    const occupiedBeds = rooms.reduce((acc, r) => acc + r.beds.filter(b => b.status === 'OCCUPIED').length, 0);

    // FIXED: Consuming requestId in log
    logger.info("Admin Metrics Generated", { 
      requestId, 
      adminUserId, 
      hospitalId,
      timestamp: new Date().toISOString() 
    });

    return {
      stats: { patients, doctors, labOrders, totalBeds, occupiedBeds },
      occupancyRate: totalBeds > 0 ? ((occupiedBeds / totalBeds) * 100).toFixed(1) + '%' : '0%'
    };
  }

  /**
   * Detailed Room-by-Room Statistics
   */
  async getBedOccupancy(adminUserId: string, requestId: string) {
    const hospitalId = await this.getAdminHospital(adminUserId);

    const roomStats = await prisma.room.findMany({
      where: { hospitalId },
      select: {
        roomNumber: true,
        type: true,
        _count: { select: { beds: true } },
        beds: { select: { bedNumber: true, status: true } }
      }
    });

    // FIXED: Consuming requestId in log
    logger.info("Bed Occupancy Report Accessed", { requestId, hospitalId });
    return roomStats;
  }

  async reviewDoctor(adminUserId: string, doctorId: string, status: 'APPROVED' | 'REJECTED', requestId: string) {
    const hospitalId = await this.getAdminHospital(adminUserId);
    const doctor = await prisma.doctor.findFirst({ 
        where: { id: doctorId, department: { hospitalId } } 
    });

    if (!doctor) throw new Error("DOCTOR_NOT_IN_YOUR_HOSPITAL");

    const updated = await prisma.doctor.update({
      where: { id: doctorId },
      data: {
        approvalStatus: status === 'APPROVED' ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED,
        verifiedAt: new Date(),
        verifiedBy: adminUserId
      }
    });

    // FIXED: Consuming requestId in log
    logger.warn(`Doctor Review Action: ${status}`, { requestId, adminUserId, targetDoctorId: doctorId });
    return updated;
  }

  async getPendingDoctors(adminUserId: string, requestId: string) {
    const hospitalId = await this.getAdminHospital(adminUserId);
    
    const pending = await prisma.doctor.findMany({
      where: { 
        approvalStatus: ApprovalStatus.PENDING,
        department: { hospitalId } 
      },
      include: { 
        department: { select: { name: true } }, 
        user: { select: { email: true } } 
      }
    });

    // FIXED: Consuming requestId in log
    logger.info("Pending Doctors List Fetched", { requestId, hospitalId, count: pending.length });
    return pending;
  }

  async getAuditHistory(page: number, limit: number, requestId: string) {
    const skip = (page - 1) * limit;
    const [records, total] = await prisma.$transaction([
      prisma.loginHistory.findMany({
        take: limit, 
        skip,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { email: true } } }
      }),
      prisma.loginHistory.count()
    ]);

    // FIXED: Consuming requestId in log
    logger.info("System Audit History Accessed", { requestId, page });
    return { records, meta: { total, page } };
  }

  async suspendUser(targetId: string, adminId: string, requestId: string) {
    if (targetId === adminId) throw new Error("SELF_SUSPEND_FORBIDDEN");

    return prisma.$transaction(async (tx) => {
      await tx.session.deleteMany({ where: { userId: targetId } });
      
      const suspended = await tx.user.update({
        where: { id: targetId },
        data: { status: UserStatus.SUSPENDED, deletedAt: new Date() }
      });

      // FIXED: Consuming requestId in log
      logger.error("User Suspended by Admin", { requestId, adminId, targetUserId: targetId });
      return suspended;
    });
  }
}