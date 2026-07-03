import { z } from 'zod';
import { Specialization } from '@prisma/client';

export const updateDoctorSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  specialization: z.nativeEnum(Specialization).optional(),
  departmentId: z.string().uuid("Invalid department ID").optional(),
  // licenseNumber is omitted here because it is IMMUTABLE
}).refine((data) => Object.keys(data).length > 0, {
  message: "Provide at least one field to update",
});

export const doctorQuerySchema = z.object({
  specialization: z.nativeEnum(Specialization).optional(),
  page: z.string().optional().transform(val => parseInt(val ?? '1')),
  limit: z.string().optional().transform(val => parseInt(val ?? '10'))
});