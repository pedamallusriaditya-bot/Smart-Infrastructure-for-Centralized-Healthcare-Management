import { Router } from 'express';
import {
  getDoctorProfile,
  updateDoctorProfile,
  getAllDoctors,
  getDoctorAnalytics
} from './doctor.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/roles.middleware.js';

const router = Router();

/**
 * Apply Authentication globally to all doctor routes
 */
router.use(authMiddleware);

/**
 * Public/General Access (Authentication Required)
 */
router.get(
  '/', 
  getAllDoctors
);

/**
 * Self-Service (Restricted to Doctors only)
 */
router.get(
  '/profile',
  requireRole('DOCTOR'),
  getDoctorProfile
);

router.put(
  '/profile',
  requireRole('DOCTOR'),
  updateDoctorProfile
);

/**
 * Management Access (Restricted to Admin only)
 */
router.get(
  '/:doctorId/analytics',
  requireRole('ADMIN'),
  getDoctorAnalytics
);

export default router;