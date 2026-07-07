import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/roles.middleware.js';
import {
  getHospitalStockAnalytics,
  getDistrictStockComparison
} from './inventory-ai.controller.js';

const router = Router();

// Apply authMiddleware globally to all AI Inventory routes
router.use(authMiddleware);

// Facility Admin Stock Analytics
router.get('/hospital', requireRole('ADMIN'), getHospitalStockAnalytics);

// District Admin / Unified Stock Overview
router.get(
  '/district',
  requireRole('APPLICATION_ADMIN', 'ADMIN'),
  getDistrictStockComparison
);

export default router;
