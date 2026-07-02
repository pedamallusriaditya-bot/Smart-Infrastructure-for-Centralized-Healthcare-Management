import { prisma } from '../../lib/prisma.js';

export class DoctorService {
  async getDoctorProfileByUserId(userId: string) {
    const doctor = await prisma.doctor.findUnique({
      where: {
        userId
      },
      include: {
        user: {
          select: {
            email: true,
            createdAt: true
          }
        },
        appointments: true
      }
    });

    if (!doctor) {
      throw new Error('Doctor profile not found');
    }

    return doctor;
  }

  async getAllDoctors(specialization?: string) {
    return prisma.doctor.findMany({
      where: specialization
        ? {
            specialization
          }
        : undefined,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        specialization: true,
        licenseNumber: true
      }
    });
  }

  async calculateDoctorWorkload(doctorId: string) {
    const doctor =
      await prisma.doctor.findUnique({
        where: {
          id: doctorId
        }
      });

    if (!doctor) {
      throw new Error('Doctor not found');
    }

    const now = new Date();

    const startOfDay =
      new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      );

    const endOfDay =
      new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59
      );

    const appointments =
      await prisma.appointment.findMany({
        where: {
          doctorId,
          appointmentDate: {
            gte: startOfDay,
            lte: endOfDay
          }
        },
        orderBy: {
          appointmentDate: 'asc'
        }
      });

    const patientsToday =
      appointments.length;

    let hoursWorked = 0;

    if (patientsToday > 0) {
      const firstAppointment =
        new Date(
          appointments[0].appointmentDate
        ).getTime();

      hoursWorked =
        Math.max(
          0,
          (now.getTime() - firstAppointment) /
          (1000 * 60 * 60)
        );
    }

    let burnoutScore = 0;

    if (hoursWorked > 10) burnoutScore += 3;
    if (hoursWorked > 12) burnoutScore += 5;
    if (patientsToday > 25) burnoutScore += 4;

    let burnoutIndicator = 'LOW';

    if (burnoutScore >= 5) {
      burnoutIndicator = 'MEDIUM';
    }

    if (burnoutScore >= 8) {
      burnoutIndicator = 'HIGH';
    }

    return {
      doctorId,
      metrics: {
        patientsToday,
        hoursWorked: hoursWorked.toFixed(1),
        averageWaitingTime:
          patientsToday > 0 ? "15 mins" : "0 mins",
        emergencyCases: 0,
        burnoutIndicator
      }
    };
  }
}