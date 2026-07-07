import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { errorResponse } from '../utils/response.util.js';
import { logger } from '../lib/logger.js';

/**
 * Middleware: requireAdminOwnHospital
 * ------------------------------------
 * Ensures the authenticated ADMIN can only access resources belonging to their
 * own assigned hospital. Non-ADMIN roles are passed through untouched.
 *
 * @param paramName - The name of the route param holding the hospitalId (default: 'hospitalId')
 *
 * Usage:
 *   router.get('/:hospitalId/rooms', authMiddleware, requireAdminOwnHospital(), getHospitalRoomsAndBeds);
 */
export const requireAdminOwnHospital = (paramName: string = 'hospitalId') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    // Only enforce for ADMIN role — other roles handled by their own guards
    if (userRole !== 'ADMIN') return next();

    if (!userId) {
      errorResponse(res, 'Authentication required.', 401, 'UNAUTHENTICATED');
      return;
    }

    const requestedHospitalId = req.params[paramName];

    if (!requestedHospitalId) {
      // No param to compare — allow through (no hospital context in this route)
      return next();
    }

    try {
      const admin = await prisma.admin.findUnique({ where: { userId } });

      if (!admin || !admin.hospitalId) {
        logger.warn('District Admin hospital boundary check: admin has no assigned hospital', {
          userId,
          requestedHospitalId,
          path: req.originalUrl,
        });
        errorResponse(res, 'Your admin account is not assigned to any hospital.', 403, 'NO_HOSPITAL_ASSIGNED');
        return;
      }

      if (admin.hospitalId !== requestedHospitalId) {
        logger.warn('District Admin hospital boundary VIOLATION', {
          userId,
          adminHospitalId: admin.hospitalId,
          requestedHospitalId,
          path: req.originalUrl,
          ip: req.ip,
        });

        // Audit log the attempted cross-hospital access
        await prisma.auditLog.create({
          data: {
            action: 'CROSS_HOSPITAL_ACCESS_ATTEMPT',
            entity: 'Hospital',
            entityId: requestedHospitalId,
            userId,
            details: {
              adminHospitalId: admin.hospitalId,
              requestedHospitalId,
              path: req.originalUrl,
              ip: req.ip,
            },
          },
        }).catch(() => {/* non-blocking */});

        errorResponse(res, 'Access Denied: You can only access your own hospital\'s resources.', 403, 'CROSS_HOSPITAL_ACCESS');
        return;
      }

      // Hospital IDs match — proceed
      next();
    } catch (error: any) {
      logger.error('District Admin hospital boundary check failed', { error: error.message, userId });
      errorResponse(res, 'Access verification failed.', 500);
    }
  };
};
