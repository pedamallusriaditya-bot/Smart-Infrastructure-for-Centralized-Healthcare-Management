import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/roles.middleware.js';
import { getFootfallAnalytics } from './analytics.controller.js';

const router = Router();

// Only Application Admin (District Admin) can fetch the complete system-wide analytics
router.get(
  '/footfall',
  authMiddleware,
  requireRole('APPLICATION_ADMIN'),
  getFootfallAnalytics
);

export default router;
