import { Router } from 'express';
import * as ctrl from './admission.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/roles.middleware.js';

const router = Router();

router.use(authMiddleware);

// DOCTOR: Can admit and discharge
router.post('/admit', requireRole('DOCTOR'), ctrl.admitPatient);
router.patch('/:id/discharge', requireRole('DOCTOR', 'ADMIN'), ctrl.dischargePatient);

// PATIENT: Can see their own room/bed info
router.get('/my-status', requireRole('PATIENT'), ctrl.getMyAdmissionStatus);

export default router;