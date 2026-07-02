// backend/src/schemas/appointment.schema.ts
import { z } from 'zod';

export const createAppointmentSchema = z.object({
  body: z.object({
    doctorId: z.string().uuid({ message: 'Invalid Doctor ID format' }),
    appointmentDate: z.string().datetime({ message: 'Date must be a valid ISO 8601 string' }),
    reason: z.string().min(5, 'Reason must be at least 5 characters long').max(200),
  }),
});