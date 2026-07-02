import { z } from 'zod';

// UUID Parameter Validation (Used for /:id routes)
export const uuidParamSchema = z.object({
  params: z.object({
    id: z.string().uuid({ message: 'Invalid UUID format' }),
  }),
});

// Generic Query Parameter Validation (e.g., for pagination or filtering)
export const queryParamSchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).optional().transform(Number),
    limit: z.string().regex(/^\d+$/).optional().transform(Number),
    specialization: z.string().optional(),
  }),
});

// Registration Validation
export const registerSchema = z.object({
  body: z.object({
    email: z.string().email({ message: 'Invalid email address' }),
    password: z.string().min(8, { message: 'Password must be at least 8 characters long' }),
    role: z.enum(['PATIENT', 'DOCTOR', 'ADMIN'], { message: 'Invalid role assignment' }),
    firstName: z.string().min(1, { message: 'First name is required' }),
    lastName: z.string().min(1, { message: 'Last name is required' }),
  }),
});

// Login Validation
export const loginSchema = z.object({
  body: z.object({
    email: z.string().email({ message: 'Invalid email address' }),
    password: z.string().min(1, { message: 'Password is required' }),
  }),
});

// Patient Update Validation
// NOTE: only fields that actually exist as columns on the Patient model are
// accepted here. `emergencyContact`, `weight`, and `age` were previously
// validated but have no matching column and no matching write in
// patient.service.ts#updatePatientProfileByUserId — they would pass
// validation, the API would respond 200, and the data would silently never
// be persisted. Removed rather than "wired up" since the schema has no
// storage for them at all yet.
export const updatePatientSchema = z.object({
  body: z.object({
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    phone: z.string().min(10, { message: 'Phone number must be at least 10 digits' }).optional(),
    bloodGroup: z.enum(['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']).optional(),
  }),
});

// Appointment Creation Validation
export const createAppointmentSchema = z.object({
  body: z.object({
    doctorId: z.string().uuid({ message: 'Invalid Doctor ID format' }),
    appointmentDate: z.string().datetime({ message: 'Must be a valid ISO 8601 date string' }),
    reason: z.string().min(5, { message: 'Reason must be at least 5 characters long' }).optional(),
  })
}).refine((data) => {
  // Business Rule: Appointments cannot be scheduled in the past
  const appointmentDate = new Date(data.body.appointmentDate);
  const now = new Date();
  return appointmentDate > now;
}, {
  message: "Appointment date must be scheduled in the future",
  path: ["body", "appointmentDate"], // This points the error directly to the specific field!
});

// Emergency Creation Validation
export const createEmergencySchema = z.object({
  body: z.object({
    patientName: z.string().min(1, { message: 'Patient name is required' }),
    severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'], { message: 'Invalid severity level' }),
    condition: z.string().min(5, { message: 'Condition description is required' }),
    location: z.string().optional(),
  })
}).refine((data) => {
  // Business Rule: CRITICAL emergencies MUST include a location
  if (data.body.severity === 'CRITICAL' && !data.body.location) {
    return false;
  }
  return true; // Pass validation for all other cases
}, {
  message: "Location is mandatory for CRITICAL severity emergencies to dispatch staff immediately",
  path: ["body", "location"],
});