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

export const getHospitalPerformanceDashboard = asyncHandler(async (req: Request, res: Response): Promise<any> => {
  try {
    const data = await adminService.getHospitalPerformanceDashboard(req.user!.id, req.requestId);
    return successResponse(res, "Hospital performance dashboard metrics retrieved", data, 200);
  } catch (error: any) {
    logger.error("getHospitalPerformanceDashboard Error", { requestId: req.requestId, error: error.message });
    if (error.message === "ADMIN_NOT_ASSIGNED_TO_HOSPITAL") {
      return errorResponse(res, "Your admin account is not linked to a hospital facility.", 403, "FORBIDDEN");
    }
    return errorResponse(res, "Failed to retrieve hospital performance dashboard metrics", 500);
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
    const filters = {
      // NOTE: hospitalId filter from query is intentionally excluded —
      // the service always scopes to the acting admin's own hospital.
      role: req.query.role as string,
      entity: req.query.entity as string,
      date: req.query.date as string,
      action: req.query.action as string,
    };

    // Pass adminUserId so service can enforce hospital-scoped audit trail
    const logs = await adminService.getAuditHistory(req.user!.id, page, limit, filters, req.requestId);
    return successResponse(res, "Audit history fetched", logs, 200);
  } catch (error: any) {
    if (error.message === "ADMIN_NOT_ASSIGNED_TO_HOSPITAL") {
      return errorResponse(res, "Your admin account is not linked to a facility.", 403, "FORBIDDEN");
    }
    return errorResponse(res, "Failed to load logs: " + error.message, 500);
  }
});

/**
 * [DELETE] Suspend User Account
 */
export const suspendUser = asyncHandler(async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;

    await adminService.suspendUser(id, req.user!.id, req.requestId);
    return successResponse(res, "User has been suspended and sessions revoked.", null, 200);
  } catch (error: any) {
    if (error.message === "SELF_SUSPEND_FORBIDDEN") {
      return errorResponse(res, "Security: You cannot suspend your own account.", 400);
    }
    if (error.message === "TARGET_USER_NOT_IN_YOUR_HOSPITAL") {
      return errorResponse(res, "Access Denied: This user does not belong to your hospital.", 403, "CROSS_HOSPITAL_ACCESS");
    }
    if (error.message === "ADMIN_NOT_ASSIGNED_TO_HOSPITAL") {
      return errorResponse(res, "Your admin account is not linked to a facility.", 403, "FORBIDDEN");
    }
    return errorResponse(res, "Suspension failed", 500);
  }
});

export const getBedOccupancy = asyncHandler(async (req: Request, res: Response): Promise<any> => {
  try {
    const occupancy = await adminService.getBedOccupancy(req.user!.id, req.requestId);
    return successResponse(res, "Bed occupancy metrics fetched", occupancy, 200);
  } catch (error: any) {
    return errorResponse(res, "Failed to load occupancy logs", 500);
  }
});

export const createDepartment = asyncHandler(async (req: Request, res: Response): Promise<any> => {
  try {
    const { name, status } = req.body;
    if (!name) return errorResponse(res, "Department name is required.", 400);
    const dept = await adminService.createDepartment(req.user!.id, name, status || 'ACTIVE', req.requestId);
    return successResponse(res, "Department created successfully.", dept, 201);
  } catch (error: any) {
    if (error.message === "DEPARTMENT_ALREADY_EXISTS") {
      return errorResponse(res, "A department with this name already exists in this hospital.", 400);
    }
    return errorResponse(res, "Department creation failed: " + error.message, 500);
  }
});

export const updateDepartment = asyncHandler(async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { name, status } = req.body;
    const dept = await adminService.updateDepartment(req.user!.id, id, name, status, req.requestId);
    return successResponse(res, "Department updated successfully.", dept, 200);
  } catch (error: any) {
    return errorResponse(res, "Department update failed: " + error.message, 500);
  }
});

export const getDepartmentStats = asyncHandler(async (req: Request, res: Response): Promise<any> => {
  try {
    const stats = await adminService.getDepartmentStats(req.user!.id, req.requestId);
    return successResponse(res, "Department statistics retrieved.", stats, 200);
  } catch (error: any) {
    return errorResponse(res, "Failed to retrieve statistics.", 500);
  }
});

export const getHospitalStaffList = asyncHandler(async (req: Request, res: Response): Promise<any> => {
  try {
    const staff = await adminService.getHospitalStaff(req.user!.id, req.requestId);
    return successResponse(res, "Staff registry retrieved.", staff, 200);
  } catch (error: any) {
    return errorResponse(res, "Failed to load staff list.", 500);
  }
});

export const registerStaffMember = asyncHandler(async (req: Request, res: Response): Promise<any> => {
  try {
    const user = await adminService.registerStaffUser(req.user!.id, req.body, req.requestId);
    return successResponse(res, "Staff user registered successfully.", user, 201);
  } catch (error: any) {
    if (error.message.includes("Unique constraint")) {
      return errorResponse(res, "Email or License/Employee ID already exists.", 400);
    }
    return errorResponse(res, "Failed to register staff: " + error.message, 500);
  }
});