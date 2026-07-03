import { Request, Response } from 'express';
import { z } from 'zod';
import { AuthService } from './auth.service.js';
import { successResponse, errorResponse } from '../../utils/response.util.js';
import { logger } from '../../lib/logger.js';

const authService = new AuthService();

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['PATIENT', 'DOCTOR', 'ADMIN']),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  extraField: z.object({
    dateOfBirth: z.string().optional(),
    gender: z.string().optional(),
    specialization: z.string().optional(),
    licenseNumber: z.string().optional(),
    departmentId: z.string().optional()
  }).optional()
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const LogoutSchema = z.object({
  refreshToken: z.string().min(1)
});

/**
 * Controller for User Registration
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = RegisterSchema.parse(req.body);
    const result = await authService.registerUser(data, req.requestId);

    successResponse(res, "Account registered successfully", result, 201);
  } catch (error: any) {
    logger.error("Controller: Registration Failure", { requestId: req.requestId, error: error.message });

    switch (error.message) {
      case "USER_ALREADY_EXISTS":
        errorResponse(res, "An account with this email already exists.", 409, "USER_ALREADY_EXISTS");
        return;
      case "DEPARTMENT_REQUIRED":
        errorResponse(res, "Department is required for doctor registration.", 400, "DEPARTMENT_REQUIRED");
        return;
      case "ADMIN_REGISTRATION_NOT_ALLOWED":
        errorResponse(res, "Admin registration is not allowed.", 403, "ADMIN_REGISTRATION_NOT_ALLOWED");
        return;
      default:
        errorResponse(res, "Registration failed.", 500, "REGISTER_FAILED");
        return;
    }
  }
};

/**
 * Controller for User Login
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = LoginSchema.parse(req.body);
    const result = await authService.loginUser(
      data,
      req.ip,
      req.headers['user-agent'] as string,
      req.requestId
    );

    successResponse(res, "Authentication successful", result, 200);
  } catch (error: any) {
    logger.error("Controller: Login Failure", { requestId: req.requestId, error: error.message });

    if (error.message === "ACCOUNT_LOCKED") {
      errorResponse(res, "Account is temporarily locked. Try again later.", 423, "ACCOUNT_LOCKED");
      return;
    }

    errorResponse(res, "Invalid email or password", 401, "LOGIN_FAILED");
  }
};

/**
 * Controller for User Logout
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = LogoutSchema.safeParse(req.body);
    if (!parseResult.success) {
      errorResponse(res, "Refresh token missing", 400, "TOKEN_MISSING");
      return;
    }

    if (!req.user) {
      errorResponse(res, "User session not found", 401, "UNAUTHORIZED");
      return;
    }

    await authService.logoutCurrentDevice(parseResult.data.refreshToken, req.user.id);
    
    successResponse(res, "Logout successful", null, 200);
  } catch (error: any) {
    logger.error("Controller: Logout Failure", { requestId: req.requestId, error: error.message });
    errorResponse(res, "Logout failed", 400, "LOGOUT_FAILED");
  }
};