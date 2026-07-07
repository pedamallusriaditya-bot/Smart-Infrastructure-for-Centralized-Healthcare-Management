import { Request, Response } from 'express';
import { InventoryAiService } from './inventory-ai.service.js';
import { successResponse, errorResponse } from '../../utils/response.util.js';

const inventoryAiService = new InventoryAiService();

export const getHospitalStockAnalytics = async (req: Request, res: Response): Promise<any> => {
  try {
    const list = await inventoryAiService.getHospitalStockAnalytics(req.user!.id);
    return successResponse(res, "Hospital stock analytics compiled successfully", list, 200);
  } catch (error: any) {
    return errorResponse(res, error.message || "Failed to compile hospital stock analytics", 500);
  }
};

export const getDistrictStockComparison = async (_req: Request, res: Response): Promise<any> => {
  try {
    const list = await inventoryAiService.getDistrictStockComparison();
    return successResponse(res, "District stock comparison compiled successfully", list, 200);
  } catch (error: any) {
    return errorResponse(res, error.message || "Failed to compile district stock comparison", 500);
  }
};
