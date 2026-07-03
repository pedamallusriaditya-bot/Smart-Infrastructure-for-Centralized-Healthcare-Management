import { Request, Response } from "express";
import { z } from "zod";
import * as appointmentService from "./appointment.service.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { successResponse, errorResponse } from "../../utils/response.util.js";
import { logger } from "../../lib/logger.js";

/**
 * ---------------------------------------------------------
 * VALIDATION SCHEMAS
 * ---------------------------------------------------------
 */

const GetAppointmentsQuerySchema = z.object({
  status: z
    .enum(["SCHEDULED", "COMPLETED", "CANCELLED", "NO_SHOW"], {
      message: "Status must be one of: SCHEDULED, COMPLETED, CANCELLED, NO_SHOW",
    })
    .optional(),
  doctorId: z.string().uuid({ message: "Invalid Doctor ID" }).optional(),
  patientId: z.string().uuid({ message: "Invalid Patient ID" }).optional(),
  date: z.string().datetime({ message: "Date must be a valid ISO 8601 string" }).optional(),
  page: z.string().optional().transform((v) => parseInt(v ?? "1")),
  limit: z.string().optional().transform((v) => parseInt(v ?? "20")),
});

const CreateAppointmentSchema = z.object({
  doctorId: z.string().uuid({ message: "Invalid doctor ID format" }),
  scheduledTime: z.string().datetime({ message: "Invalid appointment time (ISO 8601)" }),
  reason: z
    .string()
    .min(5, { message: "Reason must be at least 5 characters long" })
    .max(500, { message: "Reason is too long" }),
});

const UpdateStatusSchema = z.object({
  status: z.enum(["SCHEDULED", "COMPLETED", "CANCELLED", "NO_SHOW"], {
    // Correct logic: params object accepts a string 'message' property
    message: "Invalid status value provided",
  }),
});

const AppointmentIdSchema = z.object({
  id: z.string().uuid({ message: "Invalid appointment ID format" }),
});

/**
 * ---------------------------------------------------------
 * ERROR HANDLER (RESOURCES & BUSINESS RULES)
 * ---------------------------------------------------------
 */
function handleAppointmentError(res: Response, req: Request, error: any, fallback: string) {
  logger.error("Appointment Domain Error", {
    requestId: req.requestId,
    error: error.message,
    stack: error.stack,
    user: req.user?.id
  });

  // Healthcare Business Rules
  if (error.message === 'DOCTOR_ALREADY_BOOKED') {
    return errorResponse(res, "This doctor has a conflicting appointment at this time.", 409, "SLOT_CONFLICT");
  }

  if (error.message === 'CANNOT_BOOK_IN_PAST') {
    return errorResponse(res, "Cannot book medical appointments for dates in the past.", 400, "INVALID_DATE");
  }

  // Authorization/Identity Errors
  if (error.message === "Not allowed") {
    return errorResponse(res, "Unauthorized: You do not own this appointment or lack clinical permissions.", 403, "FORBIDDEN");
  }

  // Generic Not Found
  const isNotFound = ["Patient not found", "Doctor not found", "Appointment not found"].includes(error.message);
  if (isNotFound) {
    return errorResponse(res, error.message, 404, "NOT_FOUND");
  }

  return errorResponse(res, fallback, 500, "INTERNAL_ERROR");
}

/**
 * ---------------------------------------------------------
 * CONTROLLER ACTIONS
 * ---------------------------------------------------------
 */

/**
 * [READ] Fetch Appointments with Scope Awareness
 */
export const getAppointments = asyncHandler(async (req: Request, res: Response): Promise<any> => {
  try {
    const validation = GetAppointmentsQuerySchema.parse(req.query);

    const appointments = await appointmentService.getAllAppointments(
      validation,
      req.user!.id,
      req.user!.role
    );

    return successResponse(res, "Appointments list retrieved.", appointments, 200);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      const message = error.issues[0]?.message || "Invalid search filters.";
      return errorResponse(res, message, 400, "VALIDATION_ERROR");
    }
    return handleAppointmentError(res, req, error, "Failed to fetch appointment history.");
  }
});

/**
 * [CREATE] Book a new Appointment
 */
export const createAppointment = asyncHandler(async (req: Request, res: Response): Promise<any> => {
  try {
    const data = CreateAppointmentSchema.parse(req.body);

    const appointment = await appointmentService.create(req.user!.id, data);

    return successResponse(res, "Appointment successfully scheduled.", appointment, 201);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      const message = error.issues[0]?.message || "Invalid appointment data.";
      return errorResponse(res, message, 400, "VALIDATION_ERROR");
    }
    return handleAppointmentError(res, req, error, "Internal error during appointment booking.");
  }
});

/**
 * [UPDATE] Modify Appointment Status
 */
export const updateAppointmentStatus = asyncHandler(async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = AppointmentIdSchema.parse(req.params);
    const { status } = UpdateStatusSchema.parse(req.body);

    const appointment = await appointmentService.updateStatus(
      id,
      req.user!.id,
      req.user!.role,
      status
    );

    return successResponse(res, `Appointment status updated to ${status}.`, appointment, 200);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      const message = error.issues[0]?.message || "Invalid request params.";
      return errorResponse(res, message, 400, "VALIDATION_ERROR");
    }
    return handleAppointmentError(res, req, error, "System failed to update appointment status.");
  }
});