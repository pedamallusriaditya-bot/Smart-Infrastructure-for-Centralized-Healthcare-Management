import { Request, Response } from 'express';
import { z } from 'zod';
import { DoctorService } from './doctor.service.js';
import { successResponse, errorResponse } from '../../utils/response.util.js';
import { logger } from '../../lib/logger.js';

const doctorService = new DoctorService();

const GetAllDoctorsQuerySchema = z.object({
  specialization: z.string().optional()
});

const DoctorIdParamSchema = z.object({
  doctorId: z.string().uuid("Invalid doctor ID format")
});

const NOT_FOUND_MESSAGES = new Set([
  'Doctor profile not found',
  'Doctor not found'
]);

/**
 * Maps a caught error to an HTTP response without leaking raw internal
 * error messages (e.g. Prisma/driver errors) to the client. Known
 * "not found" errors become 404s; Zod validation errors become 400s with a
 * clean message; anything else is logged and returned as a generic 500.
 */
function handleDoctorError(res: Response, error: any, fallbackMessage: string) {
  if (error instanceof z.ZodError) {
    return errorResponse(res, 'Invalid request parameters', 400, 'VALIDATION_ERROR');
  }

  if (error instanceof Error && NOT_FOUND_MESSAGES.has(error.message)) {
    return errorResponse(res, error.message, 404, 'NOT_FOUND');
  }

  logger.error(fallbackMessage, { error: error?.message ?? error });
  return errorResponse(res, fallbackMessage, 500, 'INTERNAL_SERVER_ERROR');
}

export const getDoctorProfile = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return errorResponse(res, "Unauthorized", 401);
    }

    const doctor = await doctorService.getDoctorProfileByUserId(req.user.id);

    return successResponse(
      res,
      "Doctor profile retrieved successfully",
      doctor,
      200
    );
  } catch (error: any) {
    return handleDoctorError(res, error, 'Failed to retrieve doctor profile');
  }
};

export const getAllDoctors = async (req: Request, res: Response) => {
  try {
    const { specialization } =
      GetAllDoctorsQuerySchema.parse(req.query);

    const doctors =
      await doctorService.getAllDoctors(specialization);

    return successResponse(
      res,
      "Doctors retrieved successfully",
      doctors,
      200
    );
  } catch (error: any) {
    return handleDoctorError(res, error, 'Failed to retrieve doctors');
  }
};

export const getDoctorAnalytics = async (
  req: Request,
  res: Response
) => {
  try {
    const { doctorId } =
      DoctorIdParamSchema.parse(req.params);

    const analytics =
      await doctorService.calculateDoctorWorkload(doctorId);

    return successResponse(
      res,
      "Doctor analytics generated successfully",
      analytics,
      200
    );
  } catch (error: any) {
    return handleDoctorError(res, error, 'Failed to generate analytics');
  }
};