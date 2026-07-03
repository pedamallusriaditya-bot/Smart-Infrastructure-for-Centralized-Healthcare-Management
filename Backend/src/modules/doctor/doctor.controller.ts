import { Request, Response } from 'express';
import { DoctorService } from './doctor.service.js';
import { successResponse, errorResponse } from '../../utils/response.util.js';
import { doctorQuerySchema, updateDoctorSchema } from '../../schemas/doctor.schema.js';
import { logger } from '../../lib/logger.js';
import { z } from 'zod';

const doctorService = new DoctorService();

/**
 * Global Doctor Module Error Handler
 */
function handleDoctorError(res: Response, req: Request, error: any, fallback: string) {
  logger.error("Doctor Operation Failed", { 
    requestId: req.requestId, 
    error: error.message 
  });

  if (error.message === 'DOCTOR_NOT_FOUND') {
    return errorResponse(res, "Doctor profile not found", 404, "NOT_FOUND");
  }

  if (error.message === 'INVALID_DEPARTMENT') {
    return errorResponse(res, "The assigned department is invalid", 400, "BAD_REQUEST");
  }

  return errorResponse(res, fallback, 500, "INTERNAL_SERVER_ERROR");
}

export const getDoctorProfile = async (req: Request, res: Response): Promise<any> => {
  try {
    const doctor = await doctorService.getDoctorProfileByUserId(req.user!.id, req.requestId);
    return successResponse(res, "Doctor profile retrieved successfully", doctor);
  } catch (error: any) {
    return handleDoctorError(res, req, error, "Failed to retrieve profile");
  }
};

export const updateDoctorProfile = async (req: Request, res: Response): Promise<any> => {
  try {
    const data = updateDoctorSchema.parse(req.body);
    const updated = await doctorService.updateDoctorProfile(req.user!.id, data, req.requestId);
    return successResponse(res, "Profile updated successfully", updated);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return errorResponse(res, error.issues[0]?.message || "Invalid data", 400);
    }
    return handleDoctorError(res, req, error, "Failed to update profile");
  }
};

export const getAllDoctors = async (req: Request, res: Response): Promise<any> => {
  try {
    const { specialization, page, limit } = doctorQuerySchema.parse(req.query);
    const doctors = await doctorService.getAllDoctors({
      specialization,
      skip: (page - 1) * limit,
      take: limit
    }, req.requestId);
    return successResponse(res, "Doctors retrieved successfully", doctors);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return errorResponse(res, "Invalid filter parameters", 400);
    }
    return handleDoctorError(res, req, error, "Failed to retrieve doctors list");
  }
};

export const getDoctorAnalytics = async (req: Request, res: Response): Promise<any> => {
  try {
    const { doctorId } = req.params;
    const analytics = await doctorService.calculateWorkload(doctorId, req.requestId);
    return successResponse(res, "Workload analytics generated", analytics);
  } catch (error: any) {
    return handleDoctorError(res, req, error, "Failed to calculate analytics");
  }
};