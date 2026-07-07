import { Request, Response } from 'express';
import { DiseaseSurveillanceService } from './diseaseSurveillance.service.js';
import { successResponse, errorResponse } from '../../utils/response.util.js';

const surveillanceService = new DiseaseSurveillanceService();

export const getSurveillanceStatus = async (_req: Request, res: Response): Promise<any> => {
  try {
    const data = await surveillanceService.getSurveillanceStatus();
    return successResponse(res, "Disease surveillance status retrieved successfully", data, 200);
  } catch (error: any) {
    return errorResponse(res, error.message || "Failed to retrieve disease surveillance status", 500);
  }
};

export const getSurveillanceTrends = async (_req: Request, res: Response): Promise<any> => {
  try {
    const data = await surveillanceService.getSurveillanceTrends();
    return successResponse(res, "Disease surveillance trends retrieved successfully", data, 200);
  } catch (error: any) {
    return errorResponse(res, error.message || "Failed to retrieve disease surveillance trends", 500);
  }
};

export const triggerSurveillanceCheck = async (_req: Request, res: Response): Promise<any> => {
  try {
    const data = await surveillanceService.getSurveillanceStatus();
    return successResponse(res, "Disease surveillance scanning triggered successfully", data.alerts, 200);
  } catch (error: any) {
    return errorResponse(res, error.message || "Failed to trigger disease surveillance scanning", 500);
  }
};
