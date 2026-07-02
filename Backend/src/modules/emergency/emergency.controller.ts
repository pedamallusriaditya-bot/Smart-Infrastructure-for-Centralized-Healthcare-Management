import { Request, Response } from 'express';
import { z } from 'zod';
import { EmergencyService } from './emergency.service.js';
import { successResponse, errorResponse } from '../../utils/response.util.js';

const emergencyService = new EmergencyService();

const RegisterStaffSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  shiftInfo: z.string().optional()
});

const UpdateShiftSchema = z.object({
  shiftInfo: z.string().min(1)
});

const StaffIdSchema = z.object({
  id: z.string().uuid()
});

const NOT_FOUND_MESSAGES = new Set([
  'Emergency staff not found'
]);

const CONFLICT_MESSAGES = new Set([
  'Emergency staff already exists'
]);

/**
 * Maps a caught error to an HTTP response, mirroring the handle*Error
 * pattern used in doctor/admin/appointment controllers. Without this,
 * every failure here (validation, not-found, duplicate) fell through to a
 * blanket 400 with no machine-readable code.
 */
function handleEmergencyError(res: Response, error: any, fallbackMessage: string) {
  if (error instanceof z.ZodError) {
    return errorResponse(res, 'Invalid request parameters', 400, 'VALIDATION_ERROR');
  }

  if (error instanceof Error && NOT_FOUND_MESSAGES.has(error.message)) {
    return errorResponse(res, error.message, 404, 'NOT_FOUND');
  }

  if (error instanceof Error && CONFLICT_MESSAGES.has(error.message)) {
    return errorResponse(res, error.message, 409, 'CONFLICT');
  }

  return errorResponse(res, fallbackMessage, 500, 'INTERNAL_SERVER_ERROR');
}

export const registerEmergencyStaff = async (
  req: Request,
  res: Response
) => {
  try {
    if (!req.user) {
      return errorResponse(res, "Unauthorized", 401);
    }

    const data =
      RegisterStaffSchema.parse(req.body);

    const staff =
      await emergencyService.registerStaff(
        req.user.id,
        data
      );

    return successResponse(
      res,
      "Emergency staff registered successfully",
      staff,
      201
    );
  } catch (error: any) {
    return handleEmergencyError(res, error, 'Failed to register emergency staff');
  }
};

export const getActiveEmergencies = async (
  _req: Request,
  res: Response
) => {
  try {
    const staff =
      await emergencyService.getActiveStaff();

    return successResponse(
      res,
      "Active emergency staff retrieved successfully",
      staff,
      200
    );
  } catch (error: any) {
    return handleEmergencyError(res, error, 'Failed to retrieve emergency staff');
  }
};

export const updateEmergencyShift = async (
  req: Request,
  res: Response
) => {
  try {
    const { id } =
      StaffIdSchema.parse(req.params);

    const { shiftInfo } =
      UpdateShiftSchema.parse(req.body);

    const updated =
      await emergencyService.updateStaffShift(
        id,
        shiftInfo
      );

    return successResponse(
      res,
      "Emergency staff shift updated successfully",
      updated,
      200
    );
  } catch (error: any) {
    return handleEmergencyError(res, error, 'Failed to update shift');
  }
};