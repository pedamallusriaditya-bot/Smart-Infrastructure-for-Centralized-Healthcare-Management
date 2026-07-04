import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma.js';
import { successResponse, errorResponse } from '../../utils/response.util.js';

/**
 * PATH: GET /api/v1/hospitals
 */
export const getHospitals = async (_req: Request, res: Response) => {
  try {
    const hospitals = await prisma.hospital.findMany({
      select: { id: true, name: true } // Only send what the dropdown needs
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
      select: { id: true, name: true }
    });
    
    // Log to backend terminal so you can see if data is found
    console.log(`🔍 Found ${departments.length} departments for Hospital: ${hospitalId}`);
    
    return successResponse(res, "Departments list fetched", departments, 200);
  } catch (error) {
    return errorResponse(res, "Invalid Hospital ID or Database Error", 400);
  }
};