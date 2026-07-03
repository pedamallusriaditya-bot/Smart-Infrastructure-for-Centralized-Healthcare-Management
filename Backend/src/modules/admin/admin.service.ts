import { prisma } from '../../lib/prisma.js';
import { UserStatus } from '@prisma/client';
import { logger } from '../../lib/logger.js';

export class AdminService {
  /**
   * Optimized Aggregations for the Admin Dashboard
   */
  async getSystemMetrics(requestId: string) {
    const [userCounts, patientCount, doctorCount, appointmentCount] = await Promise.all([
      prisma.user.count(),
      prisma.patient.count(),
      prisma.doctor.count(),
      prisma.appointment.count()
    ]);

    // Efficiently get distribution without fetching full user objects
    const roleStats = await prisma.role.findMany({
      select: {
        name: true,
        _count: { select: { users: true } }
      }
    });

    logger.info("Admin: Metrics generated", { requestId });

    return {
      overview: {
        totalUsers: userCounts,
        totalPatients: patientCount,
        totalDoctors: doctorCount,
        totalAppointments: appointmentCount,
      },
      roleDistribution: roleStats.map(r => ({ role: r.name, count: r._count.users }))
    };
  }

  /**
   * Auditable Time-Series History
   */
  async getLoginAuditHistory(page: number, limit: number, requestId: string) {
    const skip = (page - 1) * limit;

    const [logs, total] = await prisma.$transaction([
      prisma.loginHistory.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: "desc" }, // Logic Fix: Order by time, not UUID
        include: {
          user: { select: { email: true, status: true } }
        },
      }),
      prisma.loginHistory.count(),
    ]);

    logger.info("Admin: Audit logs accessed", { requestId, page });

    return {
      meta: {
        total,
        page,
        totalPages: Math.ceil(total / limit)
      },
      records: logs
    };
  }

  /**
   * Compliance-Safe Deactivation (Soft Delete)
   */
  async deactivateUserAccount(id: string, adminUserId: string, requestId: string) {
    if (id === adminUserId) throw new Error('SELF_DELETE_FORBIDDEN');

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new Error('NOT_FOUND');

    return prisma.$transaction(async (tx) => {
      // 1. Terminate all active sessions (Force logout)
      await tx.session.deleteMany({ where: { userId: id } });
      await tx.refreshToken.deleteMany({ where: { userId: id } });

      // 2. Perform Soft Delete (Preserve data integrity for medical history)
      const deactivatedUser = await tx.user.update({
        where: { id },
        data: {
          status: UserStatus.SUSPENDED, // User can no longer log in
          deletedAt: new Date()
        }
      });

      logger.warn("Admin: User account suspended", { requestId, targetUserId: id, performedBy: adminUserId });
      return deactivatedUser;
    });
  }
}