import { prisma } from '../../lib/prisma.js';
import { AppointmentStatus } from '@prisma/client';
import * as auditService from '../../services/audit.service.js';

export const getAllAppointments = async (
  query: any,
  userId: string,
  role: string
) => {
  const where: any = {};

  if (role === 'PATIENT') {
    const patient = await prisma.patient.findUnique({
      where: {
        userId
      }
    });

    if (!patient) {
      throw new Error('Patient not found');
    }

    // A patient may only ever see their own appointments. This is
    // deliberately NOT overridable by query.patientId below — previously
    // it was, meaning any patient could pass ?patientId=<someone else's id>
    // and view another patient's appointments.
    where.patientId = patient.id;
  } else if (role === 'DOCTOR') {
    const doctor = await prisma.doctor.findUnique({
      where: {
        userId
      }
    });

    if (!doctor) {
      throw new Error('Doctor not found');
    }

    // Same reasoning as above: a doctor's own scope is not overridable by
    // query.doctorId, or any doctor could view any other doctor's schedule.
    where.doctorId = doctor.id;
  } else {
    // ADMIN (or any other role without a personal scope) may filter freely.
    if (query.doctorId) {
      where.doctorId = query.doctorId;
    }

    if (query.patientId) {
      where.patientId = query.patientId;
    }
  }

  if (query.status) {
    where.status = query.status;
  }

  if (query.date) {
    // query.date is validated as a full ISO datetime string, but is meant
    // to mean "appointments on this day" — match the whole day rather than
    // the exact millisecond, which would otherwise never match anything.
    const day = new Date(query.date);
    const startOfDay = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate()));
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    where.appointmentDate = {
      gte: startOfDay,
      lt: endOfDay
    };
  }

  return prisma.appointment.findMany({
    where,
    include: {
      patient: true,
      doctor: true
    },
    orderBy: {
      appointmentDate: 'asc'
    }
  });
};

export const create = async (
  userId: string,
  role: string,
  data: any
) => {
  if (role !== 'PATIENT') {
    throw new Error('Only patients can create appointments');
  }

  const patient = await prisma.patient.findUnique({
    where: {
      userId
    }
  });

  if (!patient) {
    throw new Error('Patient not found');
  }

  const doctor = await prisma.doctor.findUnique({
    where: {
      id: data.doctorId
    }
  });

  if (!doctor) {
    throw new Error('Doctor not found');
  }

  const appointment =
    await prisma.appointment.create({
      data: {
        patientId: patient.id,
        doctorId: data.doctorId,
        appointmentDate: new Date(data.scheduledTime),
        reason: data.reason,
        status: AppointmentStatus.SCHEDULED
      }
    });

  await auditService.logAction(
    'CREATE_APPOINTMENT',
    'Appointment',
    appointment.id,
    userId
  );

  return appointment;
};

export const updateStatus = async (
  id: string,
  userId: string,
  role: string,
  status: string
) => {
  const appointment =
    await prisma.appointment.findUnique({
      where: {
        id
      }
    });

  if (!appointment) {
    throw new Error('Appointment not found');
  }

  if (role === 'DOCTOR') {
    const doctor = await prisma.doctor.findUnique({
      where: {
        userId
      }
    });

    if (!doctor || appointment.doctorId !== doctor.id) {
      throw new Error('Not allowed');
    }
  }

  const updated =
    await prisma.appointment.update({
      where: {
        id
      },
      data: {
        status: status as AppointmentStatus
      }
    });

  await auditService.logAction(
    'UPDATE_APPOINTMENT_STATUS',
    'Appointment',
    id,
    userId,
    {
      status
    }
  );

  return updated;
};