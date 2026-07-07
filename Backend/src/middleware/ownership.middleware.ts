import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { errorResponse } from '../utils/response.util.js';
import { logger } from '../lib/logger.js';

/**
 * Validates that the logged-in user owns the resource they are requesting.
 * Supports: Patient records, Appointments, and Lab Orders.
 *
 * ADMIN override: District admins may bypass patient-level ownership checks,
 * BUT only for resources that belong to patients within their assigned hospital.
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

    // ADMIN: Hospital-scoped override — may access resources within their own hospital ONLY
    if (userRole === 'ADMIN') {
      try {
        const admin = await prisma.admin.findUnique({ where: { userId } });
        if (!admin || !admin.hospitalId) {
          errorResponse(res, "Your admin account is not assigned to any hospital.", 403, "NO_HOSPITAL_ASSIGNED");
          return;
        }

        // Verify the resource belongs to this admin's hospital
        let resourceBelongsToHospital = false;

        switch (resourceType) {
          case 'PATIENT': {
            const patient = await prisma.patient.findFirst({
              where: {
                id: resourceId,
                appointments: { some: { doctor: { department: { hospitalId: admin.hospitalId } } } }
              }
            });
            resourceBelongsToHospital = !!patient;
            break;
          }
          case 'APPOINTMENT': {
            const appointment = await prisma.appointment.findFirst({
              where: {
                id: resourceId,
                doctor: { department: { hospitalId: admin.hospitalId } }
              }
            });
            resourceBelongsToHospital = !!appointment;
            break;
          }
          case 'LAB_ORDER': {
            const labOrder = await prisma.labOrder.findFirst({
              where: {
                id: resourceId,
                doctor: { department: { hospitalId: admin.hospitalId } }
              }
            });
            resourceBelongsToHospital = !!labOrder;
            break;
          }
          case 'MEDICAL_RECORD': {
            const record = await prisma.medicalRecord.findFirst({
              where: {
                id: resourceId,
                patient: {
                  appointments: { some: { doctor: { department: { hospitalId: admin.hospitalId } } } }
                }
              }
            });
            resourceBelongsToHospital = !!record;
            break;
          }
        }

        if (!resourceBelongsToHospital) {
          logger.warn("District Admin Cross-Hospital Ownership Violation (BLOCKED)", {
            requestId: req.requestId,
            userId,
            adminHospitalId: admin.hospitalId,
            resourceId,
            resourceType,
          });

          await prisma.auditLog.create({
            data: {
              action: 'CROSS_HOSPITAL_OWNERSHIP_BLOCK',
              entity: resourceType,
              entityId: resourceId || 'unknown',
              userId,
              details: { adminHospitalId: admin.hospitalId, path: req.originalUrl, ip: req.ip },
            },
          }).catch(() => {/* non-blocking */});

          errorResponse(res, "Access Denied: This resource does not belong to your hospital.", 403, "CROSS_HOSPITAL_ACCESS");
          return;
        }

        // Resource is within this admin's hospital — allow
        return next();
      } catch (error: any) {
        logger.error("Admin Hospital Ownership Check Fault", { error: error.message, userId });
        errorResponse(res, "Access Denied", 403, "FORBIDDEN_OWNERSHIP");
        return;
      }
    }

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