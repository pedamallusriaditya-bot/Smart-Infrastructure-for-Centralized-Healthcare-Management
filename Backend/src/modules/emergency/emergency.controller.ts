import { Request, Response } from 'express';
import { z } from 'zod';
import { EmergencyService } from './emergency.service.js';
import { successResponse, errorResponse } from '../../utils/response.util.js';
import { logger } from '../../lib/logger.js';

const emergencyService = new EmergencyService();

// Schemas
const RegisterStaffSchema = z.object({
  targetUserId: z.string().uuid("Invalid User ID"), // Changed from req.user
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  shiftInfo: z.string().optional()
});

const EmergencyIncidentSchema = z.object({
  description: z.string().min(5),
  hospitalId: z.string().uuid().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional()
});

function handleEmergencyError(res: Response, req: Request, error: any, fallback: string) {
  logger.error("Emergency Logic Error", { requestId: req.requestId, error: error.message });
  
  if (error.message === 'UNAUTHORIZED_SHIFT_UPDATE') return errorResponse(res, "You cannot update another staff's shift", 403);
  if (error.message.includes('not found')) return errorResponse(res, error.message, 404);
  if (error.message.includes('already exists')) return errorResponse(res, error.message, 409);
  
  return errorResponse(res, fallback, 500);
}

export const triggerEmergency = async (req: Request, res: Response): Promise<any> => {
  try {
    const data = EmergencyIncidentSchema.parse(req.body);
    const result = await emergencyService.createEmergencyIncident(req.user!.id, {
      description: data.description,
      hospitalId: data.hospitalId,
      patientLatitude: data.latitude,
      patientLongitude: data.longitude
    });
    return successResponse(res, "Emergency incident created. Help is on the way.", result, 201);
  } catch (error: any) {
    return handleEmergencyError(res, req, error, "Failed to trigger emergency");
  }
};

export const resolveEmergency = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const result = await emergencyService.resolveEmergency(id);
    return successResponse(res, "Emergency resolved", result);
  } catch (error: any) {
    return handleEmergencyError(res, req, error, "Failed to resolve incident");
  }
};

export const registerEmergencyStaff = async (req: Request, res: Response): Promise<any> => {
  try {
    const { targetUserId, ...data } = RegisterStaffSchema.parse(req.body);
    const staff = await emergencyService.registerStaff(targetUserId, data);
    return successResponse(res, "Staff registered", staff, 201);
  } catch (error: any) {
    return handleEmergencyError(res, req, error, 'Failed to register staff');
  }
};

// ... updateEmergencyShift now passes req.user.id for security check
export const updateEmergencyShift = async (req: Request, res: Response): Promise<any> => {
  try {
    const { shiftInfo } = req.body;
    const updated = await emergencyService.updateStaffShift(req.params.id, req.user!.id, req.user!.role, shiftInfo);
    return successResponse(res, "Shift updated", updated);
  } catch (error: any) {
    return handleEmergencyError(res, req, error, 'Failed to update shift');
  }
};

export const getActiveStaffList = async (_req: Request, res: Response): Promise<any> => {
    try {
      const staff = await emergencyService.getActiveStaff();
      return successResponse(res, "Active staff retrieved", staff);
    } catch (error: any) {
        return errorResponse(res, "Failed", 500);
    }
};

export const getEmergencies = async (req: Request, res: Response): Promise<any> => {
  try {
    const result = await emergencyService.getEmergencies(req.user!.id, req.user!.role);
    return successResponse(res, "Emergencies list retrieved", result);
  } catch (error: any) {
    return errorResponse(res, "Failed to load emergencies list", 500);
  }
};