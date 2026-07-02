import { Request, Response } from "express";
import { z } from "zod";

import { AdminService } from "./admin.service.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  successResponse,
  errorResponse,
} from "../../utils/response.util.js";

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    role: string;
  };
}

const adminService = new AdminService();

const DeleteUserSchema = z.object({
  id: z.string().uuid({
    message: "Invalid user ID format. Must be a valid UUID.",
  }),
});

const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

/**
 * Maps errors thrown by AdminService to HTTP responses. AdminService throws
 * plain Error objects with known messages rather than AppError, so without
 * this mapping every failure (including "not found" and "self-delete
 * blocked") fell through to the global error handler's 500 default.
 */
function handleAdminError(res: Response, error: any, fallbackMessage: string) {
  if (error instanceof Error && error.message === "User not found") {
    return errorResponse(res, error.message, 404, "NOT_FOUND");
  }

  if (error instanceof Error && error.message === "Admin cannot delete own account") {
    return errorResponse(res, error.message, 400, "SELF_DELETE_FORBIDDEN");
  }

  return errorResponse(res, fallbackMessage, 500, "INTERNAL_SERVER_ERROR");
}

export const getSystemMetrics = asyncHandler(
  async (_req: AuthenticatedRequest, res: Response) => {
    const metrics = await adminService.getSystemMetrics();

    return successResponse(
      res,
      "System metrics retrieved successfully.",
      metrics
    );
  }
);

export const getLoginAuditHistory = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const validation = PaginationSchema.safeParse(req.query);

    if (!validation.success) {
      return errorResponse(
        res,
        "Invalid pagination parameters.",
        400,
        "VALIDATION_ERROR"
      );
    }

    const { page, limit } = validation.data;

    const logs = await adminService.getLoginAuditHistory(
      page,
      limit
    );

    return successResponse(
      res,
      "Audit history retrieved successfully.",
      logs
    );
  }
);

export const deleteUserAccount = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const validation = DeleteUserSchema.safeParse(req.params);

    if (!validation.success) {
      return errorResponse(
        res,
        "Invalid request parameters.",
        400,
        "VALIDATION_ERROR"
      );
    }

    const { id } = validation.data;

    try {
      await adminService.deleteUserAccount(
        id,
        req.user.id
      );
    } catch (error: any) {
      return handleAdminError(res, error, "Unable to delete user account.");
    }

    return successResponse(
      res,
      "User account securely deleted.",
      null
    );
  }
);