import { prisma } from '../../lib/prisma.js';

export class EmergencyService {
  async registerStaff(
    userId: string,
    data: {
      firstName: string;
      lastName: string;
      shiftInfo?: string;
    }
  ) {
    const existing =
      await prisma.emergencyStaff.findUnique({
        where: {
          userId
        }
      });

    if (existing) {
      throw new Error(
        'Emergency staff already exists'
      );
    }

    return prisma.emergencyStaff.create({
      data: {
        userId,
        firstName: data.firstName,
        lastName: data.lastName,
        shiftInfo:
          data.shiftInfo || 'ROTATING'
      }
    });
  }

  async getActiveStaff() {
    return prisma.emergencyStaff.findMany({
      where: {
        status: 'ACTIVE'
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        shiftInfo: true
      },
      orderBy: {
        firstName: 'asc'
      }
    });
  }

  async updateStaffShift(
    id: string,
    shiftInfo: string
  ) {
    const staff =
      await prisma.emergencyStaff.findUnique({
        where: {
          id
        }
      });

    if (!staff) {
      throw new Error(
        'Emergency staff not found'
      );
    }

    return prisma.emergencyStaff.update({
      where: {
        id
      },
      data: {
        shiftInfo
      }
    });
  }
}