import { Request, Response } from "express";
import { z } from "zod";
import * as appointmentService from "./appointment.service.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  successResponse,
  errorResponse,
} from "../../utils/response.util.js";

const GetAppointmentsQuerySchema = z.object({
  status: z
    .enum([
      "SCHEDULED",
      "COMPLETED",
      "CANCELLED",
      "NO_SHOW",
    ])
    .optional(),
  doctorId: z.string().uuid().optional(),
  patientId: z.string().uuid().optional(),
  date: z.string().datetime().optional(),
});

const CreateAppointmentSchema = z.object({
  doctorId: z.string().uuid({
    message: "Invalid doctor ID",
  }),
  scheduledTime: z.string().datetime({
    message: "Invalid appointment time",
  }),
  // Appointment.reason is a required, non-nullable column — this was
  // previously `.optional()`, so omitting it passed validation and then
  // failed as an unhandled Prisma error (raw 500) at the DB layer instead
  // of a clean 400.
  reason: z.string().min(5, {
    message: "Reason must be at least 5 characters long",
  }),
});

const UpdateStatusSchema = z.object({
  status: z.enum([
    "SCHEDULED",
    "COMPLETED",
    "CANCELLED",
    "NO_SHOW",
  ]),
});

const AppointmentIdSchema = z.object({
  id: z.string().uuid({
    message: "Invalid appointment ID",
  }),
});

/**
 * appointment.service.ts throws plain Error objects with known messages
 * rather than AppError, so without this mapping every failure — including
 * "not found" and authorization failures — fell through to the global
 * error handler's 500 default.
 */
function handleAppointmentError(res: Response, error: any, fallbackMessage: string) {
  const NOT_FOUND_MESSAGES = new Set([
    "Patient not found",
    "Doctor not found",
    "Appointment not found",
  ]);

  if (error instanceof Error && NOT_FOUND_MESSAGES.has(error.message)) {
    return errorResponse(res, error.message, 404, "NOT_FOUND");
  }

  if (error instanceof Error && error.message === "Not allowed") {
    return errorResponse(res, error.message, 403, "FORBIDDEN");
  }

  if (error instanceof Error && error.message === "Only patients can create appointments") {
    return errorResponse(res, error.message, 403, "FORBIDDEN");
  }

  return errorResponse(res, fallbackMessage, 500, "INTERNAL_SERVER_ERROR");
}

export const getAppointments = asyncHandler(
  async (req: Request, res: Response) => {
    const validation =
      GetAppointmentsQuerySchema.safeParse(req.query);

    if (!validation.success) {
      return errorResponse(
        res,
        "Invalid query parameters.",
        400,
        "VALIDATION_ERROR"
      );
    }

    if (!req.user) {
      return errorResponse(
        res,
        "Unauthorized.",
        401,
        "UNAUTHORIZED"
      );
    }

    try {
      const appointments =
        await appointmentService.getAllAppointments(
          validation.data,
          req.user.id,
          req.user.role
        );

      return successResponse(
        res,
        "Appointments retrieved successfully.",
        appointments
      );
    } catch (error: any) {
      return handleAppointmentError(res, error, "Unable to retrieve appointments.");
    }
  }
);

export const createAppointment = asyncHandler(
  async (req: Request, res: Response) => {
    const validation =
      CreateAppointmentSchema.safeParse(req.body);

    if (!validation.success) {
      return errorResponse(
        res,
        "Invalid appointment data.",
        400,
        "VALIDATION_ERROR"
      );
    }

    if (!req.user) {
      return errorResponse(
        res,
        "Unauthorized.",
        401,
        "UNAUTHORIZED"
      );
    }

    try {
      const appointment =
        await appointmentService.create(
          req.user.id,
          req.user.role,
          validation.data
        );

      return successResponse(
        res,
        "Appointment created successfully.",
        appointment,
        201
      );
    } catch (error: any) {
      return handleAppointmentError(res, error, "Unable to create appointment.");
    }
  }
);

export const updateAppointmentStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const idValidation =
      AppointmentIdSchema.safeParse(req.params);

    if (!idValidation.success) {
      return errorResponse(
        res,
        "Invalid appointment ID.",
        400,
        "VALIDATION_ERROR"
      );
    }

    const statusValidation =
      UpdateStatusSchema.safeParse(req.body);

    if (!statusValidation.success) {
      return errorResponse(
        res,
        "Invalid status.",
        400,
        "VALIDATION_ERROR"
      );
    }

    if (!req.user) {
      return errorResponse(
        res,
        "Unauthorized.",
        401,
        "UNAUTHORIZED"
      );
    }

    try {
      const appointment =
        await appointmentService.updateStatus(
          idValidation.data.id,
          req.user.id,
          req.user.role,
          statusValidation.data.status
        );

      return successResponse(
        res,
        "Appointment status updated successfully.",
        appointment
      );
    } catch (error: any) {
      return handleAppointmentError(res, error, "Unable to update appointment status.");
    }
  }
);