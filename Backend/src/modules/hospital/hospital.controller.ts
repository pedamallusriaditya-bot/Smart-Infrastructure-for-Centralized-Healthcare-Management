import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma.js';
import { successResponse, errorResponse } from '../../utils/response.util.js';
import { hashPassword } from '../../utils/password.util.js';

/**
 * PATH: GET /api/v1/hospitals
 */
export const getHospitals = async (_req: Request, res: Response) => {
  try {
    const hospitals = await prisma.hospital.findMany({
      select: { id: true, name: true, address: true, phone: true }
    });
    return successResponse(res, "Hospitals list fetched", hospitals, 200);
  } catch (error) {
    return errorResponse(res, "Failed to load hospitals", 500);
  }
};

/**
 * PATH: GET /api/v1/hospitals/:hospitalId/departments
 */
export const getDepartmentsByHospital = async (req: Request, res: Response) => {
  const { hospitalId } = req.params;
  try {
    const departments = await prisma.department.findMany({
      where: { hospitalId: hospitalId },
      select: { id: true, name: true, status: true }
    });
    
    console.log(`🔍 Found ${departments.length} departments for Hospital: ${hospitalId}`);
    return successResponse(res, "Departments list fetched", departments, 200);
  } catch (error) {
    return errorResponse(res, "Invalid Hospital ID or Database Error", 400);
  }
};

/**
 * PATH: GET /api/v1/hospitals/all-detail (Super Admin only)
 */
export const getAllHospitalsFull = async (req: Request, res: Response): Promise<any> => {
  try {
    if (req.user!.email !== 'superadmin@carehive.med') {
      return errorResponse(res, "Forbidden: Super Admin privilege required.", 403);
    }
    const hospitals = await prisma.hospital.findMany({
      include: {
        departments: { select: { id: true, name: true, status: true } },
        admins: { select: { id: true, firstName: true, lastName: true, user: { select: { email: true } } } },
        _count: { select: { rooms: true, emergencies: true } }
      }
    });
    return successResponse(res, "Detailed hospitals list retrieved.", hospitals, 200);
  } catch (error: any) {
    return errorResponse(res, "Failed to load hospital directories: " + error.message, 500);
  }
};

/**
 * PATH: POST /api/v1/hospitals (Super Admin only)
 */
export const createHospital = async (req: Request, res: Response): Promise<any> => {
  try {
    if (req.user!.email !== 'superadmin@carehive.med') {
      return errorResponse(res, "Forbidden: Super Admin privilege required.", 403);
    }
    const { name, address, phone } = req.body;
    if (!name || !address) {
      return errorResponse(res, "Hospital name and address are required.", 400);
    }
    const hospital = await prisma.hospital.create({
      data: { name, address, phone }
    });
    return successResponse(res, "Hospital successfully registered.", hospital, 201);
  } catch (error: any) {
    return errorResponse(res, "Creation failed: " + error.message, 500);
  }
};

/**
 * PATH: DELETE /api/v1/hospitals/:id (Super Admin only)
 */
export const deleteHospital = async (req: Request, res: Response): Promise<any> => {
  try {
    if (req.user!.email !== 'superadmin@carehive.med') {
      return errorResponse(res, "Forbidden: Super Admin privilege required.", 403);
    }
    const { id } = req.params;
    await prisma.hospital.delete({ where: { id } });
    return successResponse(res, "Hospital facility removed successfully.", null, 200);
  } catch (error: any) {
    return errorResponse(res, "Deletion failed: " + error.message, 500);
  }
};

/**
 * PATH: POST /api/v1/hospitals/:hospitalId/admin (Super Admin only)
 */
export const assignHospitalAdmin = async (req: Request, res: Response): Promise<any> => {
  try {
    if (req.user!.email !== 'superadmin@carehive.med') {
      return errorResponse(res, "Forbidden: Super Admin privilege required.", 403);
    }
    const { hospitalId } = req.params;
    const { email, password, firstName, lastName } = req.body;
    if (!email || !password || !firstName || !lastName) {
      return errorResponse(res, "Missing administrator credentials or name.", 400);
    }

    const adminRole = await prisma.role.findUnique({ where: { name: 'ADMIN' } });
    if (!adminRole) {
      return errorResponse(res, "System Configuration Error: ADMIN role missing.", 500);
    }

    const hashedPassword = await hashPassword(password);
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash: hashedPassword,
          roleId: adminRole.id
        }
      });
      const admin = await tx.admin.create({
        data: {
          userId: user.id,
          hospitalId,
          firstName,
          lastName
        }
      });
      return admin;
    });

    return successResponse(res, "Hospital administrator successfully assigned.", result, 201);
  } catch (error: any) {
    if (error.message.includes("Unique constraint")) {
      return errorResponse(res, "An account with this email address already exists.", 400);
    }
    return errorResponse(res, "Assignment failed: " + error.message, 500);
  }
};