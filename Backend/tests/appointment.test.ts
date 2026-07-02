import { jest, describe, beforeAll, beforeEach, test, expect } from '@jest/globals';

// 1. Register mocks BEFORE any dynamic import touches the real modules.
jest.unstable_mockModule('../src/lib/prisma.js', () => ({
    prisma: {
        patient: { findUnique: jest.fn() },
        doctor: { findUnique: jest.fn() },
        appointment: {
            findMany: jest.fn(),
            create: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
        },
    }
}));

jest.unstable_mockModule('../src/services/audit.service.js', () => ({
    logAction: jest.fn(),
}));

// 2. Dynamically import AFTER the mocks are registered.
let appointmentService: typeof import('../src/modules/appointment/appointment.service.js');
let prisma: any;
let auditService: any;

beforeAll(async () => {
    appointmentService = await import('../src/modules/appointment/appointment.service.js');
    ({ prisma } = await import('../src/lib/prisma.js'));
    auditService = await import('../src/services/audit.service.js');
});

describe('AppointmentService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getAllAppointments', () => {
        test('should scope results to the patient when role is PATIENT', async () => {
            prisma.patient.findUnique.mockResolvedValue({ id: 'patient1' });
            prisma.appointment.findMany.mockResolvedValue([{ id: 'appt1' }]);

            const result = await appointmentService.getAllAppointments({}, 'user1', 'PATIENT');

            expect(prisma.patient.findUnique).toHaveBeenCalledWith({ where: { userId: 'user1' } });
            expect(prisma.appointment.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({ patientId: 'patient1' })
                })
            );
            expect(result).toEqual([{ id: 'appt1' }]);
        });

        test('should throw when PATIENT role has no matching patient record', async () => {
            prisma.patient.findUnique.mockResolvedValue(null);

            await expect(
                appointmentService.getAllAppointments({}, 'user1', 'PATIENT')
            ).rejects.toThrow('Patient not found');
        });

        test('should scope results to the doctor when role is DOCTOR', async () => {
            prisma.doctor.findUnique.mockResolvedValue({ id: 'doctor1' });
            prisma.appointment.findMany.mockResolvedValue([{ id: 'appt2' }]);

            const result = await appointmentService.getAllAppointments({}, 'user2', 'DOCTOR');

            expect(prisma.doctor.findUnique).toHaveBeenCalledWith({ where: { userId: 'user2' } });
            expect(prisma.appointment.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({ doctorId: 'doctor1' })
                })
            );
            expect(result).toEqual([{ id: 'appt2' }]);
        });

        test('should throw when DOCTOR role has no matching doctor record', async () => {
            prisma.doctor.findUnique.mockResolvedValue(null);

            await expect(
                appointmentService.getAllAppointments({}, 'user2', 'DOCTOR')
            ).rejects.toThrow('Doctor not found');
        });

        test('should apply status, doctorId, and patientId filters from query for non-restricted roles', async () => {
            prisma.appointment.findMany.mockResolvedValue([]);

            await appointmentService.getAllAppointments(
                { status: 'COMPLETED', doctorId: 'docQ', patientId: 'patQ' },
                'admin1',
                'ADMIN'
            );

            expect(prisma.appointment.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: {
                        status: 'COMPLETED',
                        doctorId: 'docQ',
                        patientId: 'patQ'
                    }
                })
            );
        });
    });

    describe('create', () => {
        const validData = {
            doctorId: 'doctor1',
            scheduledTime: '2026-08-01T10:00:00.000Z',
            reason: 'Checkup'
        };

        test('should throw when role is not PATIENT', async () => {
            await expect(
                appointmentService.create('user1', 'DOCTOR', validData)
            ).rejects.toThrow('Only patients can create appointments');
        });

        test('should throw when patient record is not found', async () => {
            prisma.patient.findUnique.mockResolvedValue(null);

            await expect(
                appointmentService.create('user1', 'PATIENT', validData)
            ).rejects.toThrow('Patient not found');
        });

        test('should throw when doctor record is not found', async () => {
            prisma.patient.findUnique.mockResolvedValue({ id: 'patient1' });
            prisma.doctor.findUnique.mockResolvedValue(null);

            await expect(
                appointmentService.create('user1', 'PATIENT', validData)
            ).rejects.toThrow('Doctor not found');
        });

        test('should create the appointment and log the action on success', async () => {
            prisma.patient.findUnique.mockResolvedValue({ id: 'patient1' });
            prisma.doctor.findUnique.mockResolvedValue({ id: 'doctor1' });
            prisma.appointment.create.mockResolvedValue({
                id: 'appt1',
                patientId: 'patient1',
                doctorId: 'doctor1',
                status: 'SCHEDULED'
            });

            const result = await appointmentService.create('user1', 'PATIENT', validData);

            expect(prisma.appointment.create).toHaveBeenCalledWith({
                data: {
                    patientId: 'patient1',
                    doctorId: 'doctor1',
                    appointmentDate: new Date(validData.scheduledTime),
                    reason: validData.reason,
                    status: 'SCHEDULED'
                }
            });
            expect(auditService.logAction).toHaveBeenCalledWith(
                'CREATE_APPOINTMENT',
                'Appointment',
                'appt1',
                'user1'
            );
            expect(result).toEqual({
                id: 'appt1',
                patientId: 'patient1',
                doctorId: 'doctor1',
                status: 'SCHEDULED'
            });
        });
    });

    describe('updateStatus', () => {
        test('should throw when appointment is not found', async () => {
            prisma.appointment.findUnique.mockResolvedValue(null);

            await expect(
                appointmentService.updateStatus('appt1', 'user1', 'PATIENT', 'CANCELLED')
            ).rejects.toThrow('Appointment not found');
        });

        test('should throw when a DOCTOR tries to update an appointment that is not theirs', async () => {
            // Fixed behavior: updateStatus now looks up the caller's own Doctor
            // record via userId, then compares appointment.doctorId against that
            // record's id — both sides are Doctor-table ids now, not a mix of
            // Doctor id and User id.
            prisma.appointment.findUnique.mockResolvedValue({ id: 'appt1', doctorId: 'doctor1' });
            prisma.doctor.findUnique.mockResolvedValue({ id: 'doctor2', userId: 'someOtherUser' });

            await expect(
                appointmentService.updateStatus('appt1', 'someOtherUser', 'DOCTOR', 'COMPLETED')
            ).rejects.toThrow('Not allowed');
        });

        test('should throw when a DOCTOR role has no matching doctor record', async () => {
            prisma.appointment.findUnique.mockResolvedValue({ id: 'appt1', doctorId: 'doctor1' });
            prisma.doctor.findUnique.mockResolvedValue(null);

            await expect(
                appointmentService.updateStatus('appt1', 'userWithNoDoctorRecord', 'DOCTOR', 'COMPLETED')
            ).rejects.toThrow('Not allowed');
        });

        test('should allow the assigned DOCTOR to update their own appointment', async () => {
            prisma.appointment.findUnique.mockResolvedValue({ id: 'appt1', doctorId: 'doctor1' });
            prisma.doctor.findUnique.mockResolvedValue({ id: 'doctor1', userId: 'doctorUser1' });
            prisma.appointment.update.mockResolvedValue({ id: 'appt1', status: 'COMPLETED' });

            const result = await appointmentService.updateStatus('appt1', 'doctorUser1', 'DOCTOR', 'COMPLETED');

            expect(prisma.doctor.findUnique).toHaveBeenCalledWith({ where: { userId: 'doctorUser1' } });
            expect(prisma.appointment.update).toHaveBeenCalledWith({
                where: { id: 'appt1' },
                data: { status: 'COMPLETED' }
            });
            expect(result).toEqual({ id: 'appt1', status: 'COMPLETED' });
        });

        test('should update status and log the action when allowed', async () => {
            prisma.appointment.findUnique.mockResolvedValue({ id: 'appt1', doctorId: 'doctor1' });
            prisma.appointment.update.mockResolvedValue({ id: 'appt1', status: 'CANCELLED' });

            const result = await appointmentService.updateStatus('appt1', 'patientUser1', 'PATIENT', 'CANCELLED');

            expect(prisma.appointment.update).toHaveBeenCalledWith({
                where: { id: 'appt1' },
                data: { status: 'CANCELLED' }
            });
            expect(auditService.logAction).toHaveBeenCalledWith(
                'UPDATE_APPOINTMENT_STATUS',
                'Appointment',
                'appt1',
                'patientUser1',
                { status: 'CANCELLED' }
            );
            expect(result).toEqual({ id: 'appt1', status: 'CANCELLED' });
        });
    });
});