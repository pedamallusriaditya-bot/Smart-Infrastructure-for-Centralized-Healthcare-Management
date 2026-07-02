import { Router } from 'express';
import {
  getDoctorProfile,
  getAllDoctors,
  getDoctorAnalytics
} from './doctor.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/roles.middleware.js';

const router = Router();

router.use(authMiddleware);

router.get(
  '/',
  getAllDoctors
);

router.get(
  '/profile',
  requireRole('DOCTOR'),
  getDoctorProfile
);

router.get(
  '/:doctorId/analytics',
  requireRole('ADMIN'),
  getDoctorAnalytics
);

export default router;