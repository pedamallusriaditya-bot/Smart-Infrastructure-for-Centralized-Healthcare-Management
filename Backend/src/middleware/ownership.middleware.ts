import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { errorResponse } from '../utils/response.util.js';
import { logger } from '../lib/logger.js';

/**
 * Validates that the logged-in user owns the resource they are requesting.
 * Supports: Patient records, Appointments, and Lab Orders.
 */
export const checkOwnership = (resourceType: 'PATIENT' | 'APPOINTMENT' | 'LAB_ORDER' | 'MEDICAL_RECORD') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const resourceId = req.params.id || req.params.patientId || req.params.orderId;

    if (!userId) {
      errorResponse(res, "Access Denied", 403, "FORBIDDEN_OWNERSHIP");
return;
    }

    // 1. ADMIN OVERRIDE: Admins can bypass ownership checks for clinical oversight.
    if (userRole === 'ADMIN') return next();

    try {
      let isOwner = false;

      switch (resourceType) {
        case 'PATIENT':
          // Check if User is the Patient being requested
          const patient = await prisma.patient.findUnique({ where: { id: resourceId } });
          isOwner = patient?.userId === userId;
          break;

        case 'APPOINTMENT':
          // Check if User is the Patient OR the Doctor assigned to the appointment
          const appointment = await prisma.appointment.findUnique({
            where: { id: resourceId },
            include: { patient: true, doctor: true }
          });
          isOwner = appointment?.patient.userId === userId || appointment?.doctor.userId === userId;
          break;

        case 'LAB_ORDER':
          // Check if User is the Patient who owns the order
          const labOrder = await prisma.labOrder.findUnique({
            where: { id: resourceId },
            include: { patient: true }
          });
          isOwner = labOrder?.patient.userId === userId;
          break;

        case 'MEDICAL_RECORD':
          const record = await prisma.medicalRecord.findUnique({
            where: { id: resourceId },
            include: { patient: true }
          });
          isOwner = record?.patient.userId === userId;
          break;
      }

      if (!isOwner) {
        logger.warn("Unauthorized Access Attempt (Ownership Violation)", {
          requestId: req.requestId,
          userId,
          resourceId,
          resourceType
        });
        
        // AUDIT LOG: Record the security violation
        await prisma.auditLog.create({
          data: {
            action: 'UNAUTHORIZED_ACCESS_BLOCK',
            entity: resourceType,
            entityId: resourceId || 'unknown',
            userId: userId,
            details: { path: req.originalUrl, ip: req.ip }
          }
        });

        errorResponse(res, "Access Denied", 403, "FORBIDDEN_OWNERSHIP");
return;
      }

      next();
    } catch (error: any) {
      logger.error("Ownership Check Fault", { error: error.message });
      errorResponse(res, "Access Denied", 403, "FORBIDDEN_OWNERSHIP");
return;
    }
  };
};