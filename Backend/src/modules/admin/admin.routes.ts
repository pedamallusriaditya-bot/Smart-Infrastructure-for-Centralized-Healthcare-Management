import { Router } from 'express';
import * as ctrl from './admin.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/roles.middleware.js';

const router = Router();

// Global Protection
router.use(authMiddleware);
router.use(requireRole('ADMIN'));

// Dashboards
router.get('/metrics', ctrl.getSystemMetrics);
router.get('/audit', ctrl.getAuditLogs);

// Clinical Governance (Credentialing)
router.get('/doctors/pending', ctrl.getPendingDoctors);
router.patch('/doctors/:doctorId/review', ctrl.reviewDoctorAccount);

// Account Lifecycle
router.delete('/users/:id', ctrl.suspendUser);

export default router;