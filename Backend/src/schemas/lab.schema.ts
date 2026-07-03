import { z } from 'zod';
import { LabCategory, LabPriority, LabTestStatus } from '@prisma/client';

export const CreateLabOrderSchema = z.object({
  patientId: z.string().uuid("Valid Patient UUID is required"),
  testName: z.string().min(2, "Test name is required").max(100),
  category: z.nativeEnum(LabCategory, {
    message: "Please select a valid clinical category"
  }),
  priority: z.nativeEnum(LabPriority, {
    message: "Priority must be NORMAL, URGENT, or EMERGENCY"
  }).default(LabPriority.NORMAL),
  clinicalNotes: z.string().max(500).optional(),
  appointmentId: z.string().uuid().optional()
});

export const SubmitLabReportSchema = z.object({
  resultsData: z.record(z.string(), z.any()), 
  sampleId: z.string().min(5, "Sample/Barcode ID is required"),
  technicianNotes: z.string().optional(),
  fileUrl: z.string().url("A valid PDF report URL is required"),
  attachments: z.array(z.string().url()).optional().default([])
});

export const LabFilterSchema = z.object({
  status: z.nativeEnum(LabTestStatus, { message: "Invalid Status" }).optional(),
  category: z.nativeEnum(LabCategory, { message: "Invalid Category" }).optional(),
  priority: z.nativeEnum(LabPriority, { message: "Invalid Priority" }).optional(),
  page: z.string().optional().transform(v => Math.max(1, parseInt(v ?? '1'))),
  limit: z.string().optional().transform(v => Math.max(1, parseInt(v ?? '20'))),
  patientId: z.string().uuid().optional(),
});

export const VerifyReportSchema = z.object({
  doctorRemarks: z.string().min(5, "Sign-off remarks are too short for a clinical record"),
});