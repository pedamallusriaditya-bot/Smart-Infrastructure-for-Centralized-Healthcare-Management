import { prisma } from '../../lib/prisma.js';
import { AppointmentStatus } from '@prisma/client';

export const getAllAppointments = async (query: any, userId: string, role: string) => {
  const where: any = {};
  
  // Scoping Logic
  if (role === 'PATIENT') {
    const patient = await prisma.patient.findUnique({ where: { userId } });
    if (!patient) throw new Error('Patient not found');
    where.patientId = patient.id;
  } else if (role === 'DOCTOR') {
    const doctor = await prisma.doctor.findUnique({ where: { userId } });
    if (!doctor) throw new Error('Doctor not found');
    where.doctorId = doctor.id;
  } else {
    if (query.doctorId) where.doctorId = query.doctorId;
    if (query.patientId) where.patientId = query.patientId;
  }

  // Pagination for Performance (High History Load)
  const limit = parseInt(query.limit || '20');
  const page = parseInt(query.page || '1');

  return prisma.appointment.findMany({
    where,
    include: {
      patient: { select: { firstName: true, lastName: true } },
      doctor: { select: { firstName: true, lastName: true, specialization: true } }
    },
    orderBy: { appointmentDate: 'asc' },
    take: limit,
    skip: (page - 1) * limit
  });
};

export const create = async (userId: string, data: any) => {
  const patient = await prisma.patient.findUnique({ where: { userId } });
  if (!patient) throw new Error('Patient not found');

  const doctor = await prisma.doctor.findUnique({ where: { id: data.doctorId } });
  if (!doctor) throw new Error('Doctor not found');

  const scheduledDate = new Date(data.scheduledTime);

  // 1. Logic Fix: Prevent Past Booking
  if (scheduledDate < new Date()) {
    throw new Error('CANNOT_BOOK_IN_PAST');
  }

  return prisma.$transaction(async (tx) => {
    // 2. Logic Fix: DOUBLE BOOKING PREVENTION
    // We check for any SCHEDULED appointment within a 30-min window
    const windowStart = new Date(scheduledDate.getTime() - 29 * 60000);
    const windowEnd = new Date(scheduledDate.getTime() + 29 * 60000);

    const conflict = await tx.appointment.findFirst({
      where: {
        doctorId: data.doctorId,
        status: 'SCHEDULED',
        appointmentDate: { gte: windowStart, lte: windowEnd }
      }
    });

    if (conflict) {
      throw new Error('DOCTOR_ALREADY_BOOKED');
    }

    const appointment = await tx.appointment.create({
      data: {
        patientId: patient.id,
        doctorId: data.doctorId,
        appointmentDate: scheduledDate,
        reason: data.reason,
        status: AppointmentStatus.SCHEDULED
      }
    });

    // 3. Log Audit inside TX for reliability
    await tx.auditLog.create({
      data: {
        action: 'CREATE_APPOINTMENT',
        entity: 'Appointment',
        entityId: appointment.id,
        userId: userId
      }
    });

    return appointment;
  });
};

export const updateStatus = async (id: string, userId: string, role: string, newStatus: string) => {
  const appointment = await prisma.appointment.findUnique({ 
    where: { id },
    include: { patient: true, doctor: true }
  });

  if (!appointment) throw new Error('Appointment not found');

  // Logic Fix: STATUS TRANSITION PERMISSIONS
  if (role === 'PATIENT') {
    // Patients can ONLY cancel their own appointment
    if (appointment.patient.userId !== userId || newStatus !== 'CANCELLED') {
      throw new Error('Not allowed');
    }
  }

  if (role === 'DOCTOR') {
    // Doctors can update appointments assigned to them
    if (appointment.doctor.userId !== userId) throw new Error('Not allowed');
  }

  return prisma.appointment.update({
    where: { id },
    data: { status: newStatus as AppointmentStatus }
  });
};