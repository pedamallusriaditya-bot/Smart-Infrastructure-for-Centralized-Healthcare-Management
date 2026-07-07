import { Request, Response } from 'express';
import { LabService } from './lab.service.js';
import { successResponse, errorResponse } from '../../utils/response.util.js';
import { logger } from '../../lib/logger.js';
import { z } from 'zod';
import { 
  CreateLabOrderSchema, 
  SubmitLabReportSchema, 
  LabFilterSchema, 
  VerifyReportSchema 
} from '../../schemas/lab.schema.js';

const labService = new LabService();

/**
 * Enterprise Exception Handler for LIS Domain
 */
function handleLabError(res: Response, req: Request, error: any, fallback: string) {
  logger.error("LIS Controller Fault", { requestId: req.requestId, error: error.message });

  if (error instanceof z.ZodError) {
    return errorResponse(res, error.issues[0]?.message || "Input Validation Failed", 400);
  }

  const notFound = ["Patient not found", "Doctor not found", "Lab order not found", "Appointment not found"];
  if (notFound.some(msg => error.message.includes(msg))) {
    return errorResponse(res, error.message, 404);
  }

  if (error.message === "UNAUTHORIZED_ACCESS" || error.message.includes("not allowed")) {
    return errorResponse(res, "Access Denied: Resource outside your scope", 403);
  }

  if (error.message === "ACTIVE_ORDER_EXISTS" || error.message === "INVALID_STATUS_TRANSITION" || error.message === "ORDER_MUST_BE_PROCESSING_TO_FULFILL") {
    return errorResponse(res, error.message, 400);
  }

  return errorResponse(res, fallback, 500);
}

export const placeOrder = async (req: Request, res: Response): Promise<any> => {
  try {
    const data = CreateLabOrderSchema.parse(req.body);
    const order = await labService.createOrder(req.user!.id, data, req.requestId);
    return successResponse(res, "Laboratory test successfully ordered.", order, 201);
  } catch (error: any) {
    return handleLabError(res, req, error, "Failed to initiate lab order.");
  }
};

export const updateStatus = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const result = await labService.updateWorkflowStatus(id, status, req.requestId);
    return successResponse(res, "Laboratory workflow status advanced.", result);
  } catch (error: any) {
    return handleLabError(res, req, error, "Workflow transition failed.");
  }
};

export const submitReport = async (req: Request, res: Response): Promise<any> => {
  try {
    const payload = SubmitLabReportSchema.parse(req.body);
    const report = await labService.fulfillOrder(req.user!.id, req.params.orderId, payload, req.requestId);
    return successResponse(res, "Clinical report generated and AI summarized.", report, 201);
  } catch (error: any) {
    return handleLabError(res, req, error, "Report submission rejected.");
  }
};

export const getReports = async (req: Request, res: Response): Promise<any> => {
  try {
    const filter = LabFilterSchema.parse(req.query);
    const result = await labService.getReports(filter, req.user!, req.requestId);
    return successResponse(res, "Search results successfully fetched.", result);
  } catch (error: any) {
    return handleLabError(res, req, error, "Internal fetch failure.");
  }
};

export const verifyReport = async (req: Request, res: Response): Promise<any> => {
  try {
    const { doctorRemarks } = VerifyReportSchema.parse(req.body);
    const result = await labService.verifyReport(req.params.reportId, req.user!.id, doctorRemarks, req.requestId);
    return successResponse(res, "Clinician sign-off complete.", result);
  } catch (error: any) {
    return handleLabError(res, req, error, "Verification failed.");
  }
};