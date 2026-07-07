import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/roles.middleware.js';
import {
  getOwnHospitalDiagnostics,
  updateHospitalDiagnostics,
  getDistrictComparison,
  lookupDiagnosticTest
} from './diagnostic.controller.js';

const router = Router();

// Apply authMiddleware globally to all diagnostic routes
router.use(authMiddleware);

// Facility Admin operations
router.get('/hospital', requireRole('ADMIN'), getOwnHospitalDiagnostics);
router.put('/hospital', requireRole('ADMIN'), updateHospitalDiagnostics);

// Unified Lookup tool (Open to all authenticated roles: Doctors, Nurses, Patients, Admins)
router.get('/lookup', lookupDiagnosticTest);

// District comparison matrix (Open to Application Admins, Hospital Admins, and Doctors)
router.get(
  '/district', 
  requireRole('APPLICATION_ADMIN', 'ADMIN', 'DOCTOR'), 
  getDistrictComparison
);

export default router;
