import { Request, Response } from 'express';
import { AnalyticsService } from './analytics.service.js';
import { successResponse, errorResponse } from '../../utils/response.util.js';

const analyticsService = new AnalyticsService();

export const getFootfallAnalytics = async (_req: Request, res: Response): Promise<any> => {
  try {
    const data = await analyticsService.getFootfallAnalytics();
    return successResponse(res, "Footfall analytics retrieved successfully", data, 200);
  } catch (error: any) {
    return errorResponse(res, error.message || "Failed to retrieve footfall analytics", 500);
  }
};
