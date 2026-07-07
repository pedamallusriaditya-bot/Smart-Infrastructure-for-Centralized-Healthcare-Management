import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/roles.middleware.js';
import {
  getHospitalForecasts,
  generateHospitalForecast,
  getDistrictForecastComparison
} from './demand.controller.js';

const router = Router();

// Apply authMiddleware globally to all AI demand routes
router.use(authMiddleware);

// Facility Admin operations
router.get('/hospital', requireRole('ADMIN'), getHospitalForecasts);
router.post('/hospital', requireRole('ADMIN'), generateHospitalForecast);

// District Admin comparison matrix
router.get(
  '/district',
  requireRole('APPLICATION_ADMIN', 'ADMIN'),
  getDistrictForecastComparison
);

export default router;
