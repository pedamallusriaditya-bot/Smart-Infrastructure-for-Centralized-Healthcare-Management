import { Request, Response } from 'express';
import { DiagnosticService } from './diagnostic.service.js';
import { successResponse, errorResponse } from '../../utils/response.util.js';
import { TestType, AvailabilityStatus } from '@prisma/client';

const diagnosticService = new DiagnosticService();

export const getOwnHospitalDiagnostics = async (req: Request, res: Response): Promise<any> => {
  try {
    const list = await diagnosticService.getOwnHospitalDiagnostics(req.user!.id);
    return successResponse(res, "Hospital diagnostics retrieved successfully", list, 200);
  } catch (error: any) {
    return errorResponse(res, error.message || "Failed to retrieve diagnostics list", 500);
  }
};

export const updateHospitalDiagnostics = async (req: Request, res: Response): Promise<any> => {
  try {
    const { updates } = req.body; // Array of { testType, status, cost }
    if (!updates || !Array.isArray(updates)) {
      return errorResponse(res, "An array of updates is required.", 400);
    }

    // Input validation
    const validTypes = Object.values(TestType);
    const validStatuses = Object.values(AvailabilityStatus);

    for (const item of updates) {
      if (!validTypes.includes(item.testType as TestType)) {
        return errorResponse(res, `Invalid testType: ${item.testType}`, 400);
      }
      if (!validStatuses.includes(item.status as AvailabilityStatus)) {
        return errorResponse(res, `Invalid status: ${item.status}`, 400);
      }
      if (item.cost != null && typeof item.cost !== 'number') {
        return errorResponse(res, `Invalid cost: cost must be a numeric value`, 400);
      }
    }

    const updated = await diagnosticService.updateHospitalDiagnostics(req.user!.id, updates);
    return successResponse(res, "Diagnostics availability updated successfully", updated, 200);
  } catch (error: any) {
    return errorResponse(res, error.message || "Failed to update diagnostics list", 500);
  }
};

export const getDistrictComparison = async (_req: Request, res: Response): Promise<any> => {
  try {
    const comparison = await diagnosticService.getDistrictComparison();
    return successResponse(res, "District diagnostics comparison retrieved successfully", comparison, 200);
  } catch (error: any) {
    return errorResponse(res, error.message || "Failed to retrieve district comparison", 500);
  }
};

export const lookupDiagnosticTest = async (req: Request, res: Response): Promise<any> => {
  try {
    const { hospitalId, testType } = req.query;

    if (!hospitalId || typeof hospitalId !== 'string') {
      return errorResponse(res, "Query parameter hospitalId (string) is required.", 400);
    }
    if (!testType || typeof testType !== 'string') {
      return errorResponse(res, "Query parameter testType (string) is required.", 400);
    }

    const validTypes = Object.values(TestType);
    if (!validTypes.includes(testType as TestType)) {
      return errorResponse(res, `Invalid testType: ${testType}. Must be one of: ${validTypes.join(', ')}`, 400);
    }

    const lookupResult = await diagnosticService.lookupDiagnosticTest(hospitalId, testType as TestType);
    return successResponse(res, "Diagnostic lookup completed successfully", lookupResult, 200);
  } catch (error: any) {
    if (error.message === "HOSPITAL_NOT_FOUND") {
      return errorResponse(res, "Target hospital facility not found.", 404);
    }
    return errorResponse(res, error.message || "Failed to perform diagnostic lookup", 500);
  }
};
