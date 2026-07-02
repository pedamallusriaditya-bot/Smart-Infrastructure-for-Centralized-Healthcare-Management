import { Router } from 'express';
import {
  registerEmergencyStaff,
  getActiveEmergencies,
  updateEmergencyShift
} from './emergency.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/roles.middleware.js';

const router = Router();

router.use(authMiddleware);

router.post(
  '/staff',
  requireRole('ADMIN'),
  registerEmergencyStaff
);

router.get(
  '/active',
  requireRole(
    'DOCTOR',
    'EMERGENCY_STAFF',
    'ADMIN'
  ),
  getActiveEmergencies
);

router.patch(
  '/:id/shift',
  requireRole(
    'EMERGENCY_STAFF',
    'ADMIN'
  ),
  updateEmergencyShift
);

export default router;