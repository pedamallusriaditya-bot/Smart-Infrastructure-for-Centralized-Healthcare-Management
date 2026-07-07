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
router.get('/performance-dashboard', ctrl.getHospitalPerformanceDashboard);
router.get('/audit', ctrl.getAuditLogs);

// Clinical Governance (Credentialing)
router.get('/doctors/pending', ctrl.getPendingDoctors);
router.patch('/doctors/:doctorId/review', ctrl.reviewDoctorAccount);

// Account Lifecycle
router.delete('/users/:id', ctrl.suspendUser);

// Rooms & Bed Occupancy Stats
router.get('/bed-occupancy', ctrl.getBedOccupancy);

// Departments Management
router.post('/departments', ctrl.createDepartment);
router.put('/departments/:id', ctrl.updateDepartment);
router.get('/departments/stats', ctrl.getDepartmentStats);

// Staff Directory & Registry Management
router.get('/staff', ctrl.getHospitalStaffList);
router.post('/staff/register', ctrl.registerStaffMember);

export default router;