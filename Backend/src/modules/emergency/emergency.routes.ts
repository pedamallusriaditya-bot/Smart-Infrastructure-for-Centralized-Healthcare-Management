import { Router } from 'express';
import * as ctrl from './emergency.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/roles.middleware.js';

const router = Router();
router.use(authMiddleware);

// --- Incident Management ---
// Anyone (Patient/Admin) can trigger help
router.post('/trigger', ctrl.triggerEmergency); 
// Only clinical/emergency staff can resolve
router.patch('/:id/resolve', requireRole('EMERGENCY_STAFF', 'DOCTOR', 'ADMIN'), ctrl.resolveEmergency);

// --- Staff Management ---
router.post('/staff', requireRole('ADMIN'), ctrl.registerEmergencyStaff);
router.get('/active-staff', requireRole('DOCTOR', 'EMERGENCY_STAFF', 'ADMIN'), ctrl.getActiveStaffList);
router.patch('/staff/:id/shift', requireRole('EMERGENCY_STAFF', 'ADMIN'), ctrl.updateEmergencyShift);

export default router;