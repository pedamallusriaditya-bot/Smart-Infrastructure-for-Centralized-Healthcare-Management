import { Router } from 'express';
import * as ctrl from './lab.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/roles.middleware.js';

const router = Router();

router.use(authMiddleware);

// Physicians order tests
router.post('/orders', requireRole('DOCTOR'), ctrl.placeOrder);

// Lab Technicians input raw data and file URLs
router.post('/reports/:orderId', requireRole('LAB_TECHNICIAN'), ctrl.submitReport);

// Lab Technicians advance the LIS workflow status
router.patch('/orders/:id/status', requireRole('LAB_TECHNICIAN'), ctrl.updateStatus);

// All healthcare participants view filtered reports (Privacy handled in service)
router.get('/reports', requireRole('PATIENT', 'DOCTOR', 'LAB_TECHNICIAN', 'ADMIN'), ctrl.getReports);

// Doctors sign off on the analysis
router.patch('/verify/:reportId', requireRole('DOCTOR'), ctrl.verifyReport);

export default router;