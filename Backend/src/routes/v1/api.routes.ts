import { Router } from 'express';
import { fetchAITimeline } from '../../modules/timeline/timeline.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/roles.middleware.js';

const router = Router();

router.use(authMiddleware);

router.get(
  '/timeline/:patientId',
  requireRole(
    'PATIENT',
    'DOCTOR',
    'ADMIN'
  ),
  fetchAITimeline
);

export default router;