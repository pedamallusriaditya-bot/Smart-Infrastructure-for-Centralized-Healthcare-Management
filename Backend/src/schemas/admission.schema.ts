import { z } from 'zod';

export const AdmitPatientSchema = z.object({
  patientId: z.string().uuid("Invalid Patient ID"),
  bedId: z.string().uuid("Invalid Bed ID"),
  reason: z.string().min(5, "Admission reason must be detailed"),
});

export const DischargePatientSchema = z.object({
  admissionId: z.string().uuid("Invalid Admission ID"),
});