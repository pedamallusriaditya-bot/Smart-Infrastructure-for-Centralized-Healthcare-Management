import { Request, Response } from "express";
import { z } from "zod";
import { AdminService } from "./admin.service.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { successResponse, errorResponse } from "../../utils/response.util.js";
import { logger } from "../../lib/logger.js";

const adminService = new AdminService();

/**
 * Zod Schemas for local validation
 */
const ReviewDoctorSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED'])
});

const PaginationSchema = z.object({
  page: z.string().optional().transform(v => Math.max(1, parseInt(v ?? '1'))),
  limit: z.string().optional().transform(v => Math.max(1, parseInt(v ?? '50')))
});

/**
 * [GET] System-wide Metrics
 */
export const getSystemMetrics = asyncHandler(async (req: Request, res: Response): Promise<any> => {
  try {
    // FIXED: Pass 2 arguments -> (adminUserId, requestId)
    // req.user!.id comes from the authMiddleware
    const metrics = await adminService.getSystemMetrics(req.user!.id, req.requestId);

    return successResponse(res, "Hospital metrics generated", metrics, 200);
  } catch (error: any) {
    logger.error("Metrics Generation Error", { requestId: req.requestId, error: error.message });
    
    if (error.message === "ADMIN_NOT_ASSIGNED_TO_HOSPITAL") {
      return errorResponse(res, "Your account is not linked to a hospital facility.", 403, "FORBIDDEN");
    }
    
    return errorResponse(res, "Failed to generate system report", 500);
  }
});
/**
 * [GET] Doctors awaiting approval for THIS Admin's hospital
 */
export const getPendingDoctors = asyncHandler(async (req: Request, res: Response): Promise<any> => {
  try {
    // FIXED: Now passing 2 arguments (adminUserId, requestId)
    const doctors = await adminService.getPendingDoctors(req.user!.id, req.requestId);
    return successResponse(res, "Pending approval queue retrieved", doctors, 200);
  } catch (error: any) {
    if (error.message === "ADMIN_NOT_ASSIGNED_TO_HOSPITAL") {
      return errorResponse(res, "Your admin account is not linked to a facility.", 403, "FORBIDDEN");
    }
    return errorResponse(res, "Unable to fetch pending doctors.", 500);
  }
});

/**
 * [PATCH] Review Doctor Credentials
 */
export const reviewDoctorAccount = asyncHandler(async (req: Request, res: Response): Promise<any> => {
  try {
    const { doctorId } = req.params;
    const { status } = ReviewDoctorSchema.parse(req.body);

    // FIXED: Now passing 4 arguments (adminUserId, doctorId, status, requestId)
    const result = await adminService.reviewDoctor(
      req.user!.id, 
      doctorId, 
      status, 
      req.requestId
    );
    
    return successResponse(res, `Practitioner status updated to ${status}`, result, 200);
  } catch (error: any) {
    if (error instanceof z.ZodError) return errorResponse(res, "Invalid status choice", 400);
    return errorResponse(res, "Review process failed", 500);
  }
});

/**
 * [GET] Full Audit Trail
 */
export const getAuditLogs = asyncHandler(async (req: Request, res: Response): Promise<any> => {
  try {
    const { page, limit } = PaginationSchema.parse(req.query);
    
    // FIXED: Now passing 3 arguments (page, limit, requestId)
    const logs = await adminService.getAuditHistory(page, limit, req.requestId);
    return successResponse(res, "Audit history fetched", logs, 200);
  } catch (error: any) {
    return errorResponse(res, "Failed to load logs", 500);
  }
});

/**
 * [DELETE] Suspend User Account
 */
export const suspendUser = asyncHandler(async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    
    // FIXED: Now passing 3 arguments (targetUserId, adminId, requestId)
    await adminService.suspendUser(id, req.user!.id, req.requestId);
    return successResponse(res, "User has been suspended and sessions revoked.", null, 200);
  } catch (error: any) {
    if (error.message === "SELF_SUSPEND_FORBIDDEN") {
      return errorResponse(res, "Security: You cannot suspend your own account.", 400);
    }
    return errorResponse(res, "Suspension failed", 500);
  }
});