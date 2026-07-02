import { prisma } from '../../lib/prisma.js';

export class AdminService {
  async getSystemMetrics() {
    const totalUsers =
      await prisma.user.count();

    const totalPatients =
      await prisma.patient.count();

    const totalDoctors =
      await prisma.doctor.count();

    const roles =
      await prisma.role.findMany({
        select: {
          name: true,
          users: {
            select: {
              id: true
            }
          }
        }
      });

    const roleDistribution = roles.map((role) => ({
      role: role.name,
      count: role.users.length
    }));

    return {
      totalUsers,
      totalPatients,
      totalDoctors,
      roleDistribution
    };
  }

  async getLoginAuditHistory(
  page = 1,
  limit = 50
) {
  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    prisma.loginHistory.findMany({
      skip,
      take: limit,
      orderBy: {
        id: "desc",
      },
      include: {
        user: {
          select: {
            email: true,
            role: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    }),
    prisma.loginHistory.count(),
  ]);

  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    records: logs,
  };
}

  async deleteUserAccount(
    id: string,
    adminId: string
  ) {
    if (id === adminId) {
      throw new Error(
        'Admin cannot delete own account'
      );
    }

    const user =
      await prisma.user.findUnique({
        where: {
          id
        }
      });

    if (!user) {
      throw new Error(
        'User not found'
      );
    }

    await prisma.$transaction([
      prisma.refreshToken.deleteMany({
        where: {
          userId: id
        }
      }),
      prisma.loginHistory.deleteMany({
        where: {
          userId: id
        }
      }),
      prisma.user.delete({
        where: {
          id
        }
      })
    ]);

    return true;
  }
}