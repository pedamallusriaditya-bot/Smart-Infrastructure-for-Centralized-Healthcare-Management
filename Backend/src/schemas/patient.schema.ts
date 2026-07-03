import { z } from 'zod';

export const updatePatientSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone format").optional(),
  bloodGroup: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional(),
  address: z.string().optional(),
  insuranceNumber: z.string().optional()
}).refine((data) => Object.keys(data).length > 0, {
  message: "At least one field must be provided for update (PATIENT_10)",
});

export const medicalHistoryQuerySchema = z.object({
  page: z.string().optional().transform(val => parseInt(val ?? '1')),
  limit: z.string().optional().transform(val => parseInt(val ?? '10'))
});