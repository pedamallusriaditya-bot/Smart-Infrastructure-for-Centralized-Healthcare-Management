import { Request, Response } from 'express';
import { z } from 'zod';
import { AuthService } from './auth.service.js';
import { successResponse, errorResponse } from '../../utils/response.util.js';
import { logger } from '../../lib/logger.js';

const authService = new AuthService();

/**
 * Validation Schemas
 */
const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['PATIENT', 'DOCTOR']),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  extraField: z.object({
    dateOfBirth: z.string().optional(),
    licenseNumber: z.string().optional(),
    departmentId: z.string().uuid().optional(),
    specialization: z.string().optional()
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
 * [PUBLIC] Account Registration
 */
export const register = async (req: Request, res: Response): Promise<any> => {
  try {
    const data = RegisterSchema.parse(req.body);
    const result = await authService.registerUser(data, req.requestId);
    return successResponse(res, "Account registered successfully", result, 201);
  } catch (error: any) {
    logger.error("Registration Failure", { requestId: req.requestId, error: error.message });
    const status = error.message.includes("EXISTS") ? 409 : 400;
    return errorResponse(res, error.message, status, "REGISTER_FAILED");
  }
};

/**
 * [PUBLIC] Account Login (With Clinical Gate)
 */
export const login = async (req: Request, res: Response): Promise<any> => {
  try {
    const data = LoginSchema.parse(req.body);
    const result = await authService.loginUser(
      data, 
      req.ip, 
      req.headers['user-agent'] as string, 
      req.requestId
    );
    return successResponse(res, "Authentication successful", result, 200);
  } catch (error: any) {
    logger.error("Login Failure", { requestId: req.requestId, error: error.message });
    
    if (error.message === "ACCOUNT_LOCKED") {
      return errorResponse(res, "Account is temporarily locked. Try again in 15 mins.", 423, "LOCKED");
    }
    if (error.message === "DOCTOR_PENDING_APPROVAL") {
      return errorResponse(res, "Credentials under review by administrative board.", 403, "PENDING_APPROVAL");
    }
    if (error.message === "DOCTOR_ACCOUNT_REJECTED") {
      return errorResponse(res, "Medical credentials could not be verified.", 401, "REJECTED");
    }

    return errorResponse(res, "Invalid email or password", 401, "AUTH_FAILED");
  }
};

/**
 * [SECURE] Session Revocation (Logout)
 */
export const logout = async (req: Request, res: Response): Promise<any> => {
  try {
    const parseResult = LogoutSchema.safeParse(req.body);
    if (!parseResult.success) {
      return errorResponse(res, "Valid refresh token required for logout.", 400, "TOKEN_MISSING");
    }

    // Secure Ownership Revocation
    await authService.logoutCurrentDevice(parseResult.data.refreshToken, req.user!.id);
    
    return successResponse(res, "Session terminated successfully.", null, 200);
  } catch (error: any) {
    logger.error("Logout Error", { requestId: req.requestId, error: error.message });
    return errorResponse(res, "Logout failed", 400, "LOGOUT_FAILED");
  }
};