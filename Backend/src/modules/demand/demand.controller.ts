import { Request, Response } from 'express';
import { DemandService } from './demand.service.js';
import { successResponse, errorResponse } from '../../utils/response.util.js';

const demandService = new DemandService();

export const getHospitalForecasts = async (req: Request, res: Response): Promise<any> => {
  try {
    const list = await demandService.getHospitalForecasts(req.user!.id);
    return successResponse(res, "Hospital demand forecasts compiled successfully", list, 200);
  } catch (error: any) {
    return errorResponse(res, error.message || "Failed to compile demand forecasts", 500);
  }
};

export const generateHospitalForecast = async (req: Request, res: Response): Promise<any> => {
  try {
    const { horizon } = req.body; // 7, 30, or 90
    if (!horizon || ![7, 30, 90].includes(Number(horizon))) {
      return errorResponse(res, "Invalid horizon. Must be 7, 30, or 90 days.", 400);
    }

    // Resolve hospital
    const admin = await prisma.admin.findUnique({ where: { userId: req.user!.id } });
    if (!admin || !admin.hospitalId) {
      return errorResponse(res, "Admin is not assigned to a hospital facility.", 403);
    }

    const forecast = await demandService.generateForecast(admin.hospitalId, Number(horizon));
    return successResponse(res, "Demand forecast generated successfully", forecast, 201);
  } catch (error: any) {
    return errorResponse(res, error.message || "Failed to generate demand forecast", 500);
  }
};

import { prisma } from '../../lib/prisma.js';

export const getDistrictForecastComparison = async (_req: Request, res: Response): Promise<any> => {
  try {
    const list = await demandService.getDistrictForecastComparison();
    return successResponse(res, "District demand forecasts compared successfully", list, 200);
  } catch (error: any) {
    return errorResponse(res, error.message || "Failed to compile district demand comparison", 500);
  }
};
