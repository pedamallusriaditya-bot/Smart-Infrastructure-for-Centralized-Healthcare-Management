import { Request, Response } from "express";
import { z } from "zod";
import { AdminService } from "./admin.service.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { successResponse, errorResponse } from "../../utils/response.util.js";
import { logger } from "../../lib/logger.js";

const adminService = new AdminService();

/**
 * Zod Schemas
 */
const DeactivateSchema = z.object({
  id: z.string().uuid("Invalid ID format")
});

const PaginationSchema = z.object({
  page: z.string().optional().transform(v => Math.max(1, parseInt(v ?? '1'))),
  limit: z.string().optional().transform(v => Math.max(1, parseInt(v ?? '50')))
});

/**
 * Standard Admin Error Mapping
 */
function handleAdminError(res: Response, req: Request, error: any, fallback: string) {
  logger.error("Admin Domain Fault", { requestId: req.requestId, error: error.message });

  if (error.message === 'NOT_FOUND') return errorResponse(res, "User not found", 404, "NOT_FOUND");
  if (error.message === 'SELF_DELETE_FORBIDDEN') return errorResponse(res, "You cannot deactivate your own admin account.", 400, "BAD_REQUEST");

  return errorResponse(res, fallback, 500, "INTERNAL_ERROR");
}

export const getSystemMetrics = asyncHandler(async (req: Request, res: Response): Promise<any> => {
  try {
    const metrics = await adminService.getSystemMetrics(req.requestId);
    // Passing all 3 required arguments
    return successResponse(res, "High-level metrics retrieved", metrics, 200);
  } catch (error: any) {
    return handleAdminError(res, req, error, "Failed to generate system report.");
  }
});

export const getLoginAuditHistory = asyncHandler(async (req: Request, res: Response): Promise<any> => {
  try {
    const { page, limit } = PaginationSchema.parse(req.query);
    const logs = await adminService.getLoginAuditHistory(page, limit, req.requestId);
    // Passing all 3 required arguments
    return successResponse(res, "Access logs retrieved", logs, 200);
  } catch (error: any) {
    if (error instanceof z.ZodError) return errorResponse(res, "Invalid params", 400, "VALIDATION_ERROR");
    return handleAdminError(res, req, error, "Unable to retrieve audit history.");
  }
});

export const deleteUserAccount = asyncHandler(async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = DeactivateSchema.parse(req.params);
    await adminService.deactivateUserAccount(id, req.user!.id, req.requestId);
    
    // FIXED: Passed 'null' as the 3rd argument (data) to satisfy the utility requirements
    return successResponse(res, "Account successfully deactivated and sessions purged.", null, 200);
  } catch (error: any) {
    if (error instanceof z.ZodError) return errorResponse(res, "Valid UUID required", 400, "VALIDATION_ERROR");
    return handleAdminError(res, req, error, "User deactivation failed.");
  }
});