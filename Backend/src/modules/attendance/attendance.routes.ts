import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/roles.middleware.js';
import {
  checkInDoctor,
  checkOutDoctor,
  updateAttendanceStatus,
  getMyTodayAttendance,
  getMyAttendanceSummary,
  getHospitalAttendanceToday,
  getHospitalAttendanceMetrics,
  getDistrictAttendanceSummary,
  getDistrictHospitalsStats
} from './attendance.controller.js';

const router = Router();

// Apply authMiddleware globally to all attendance routes
router.use(authMiddleware);

// Doctor self-service
router.post('/check-in', requireRole('DOCTOR'), checkInDoctor);
router.post('/check-out', requireRole('DOCTOR'), checkOutDoctor);
router.post('/status', requireRole('DOCTOR'), updateAttendanceStatus);
router.get('/my-today', requireRole('DOCTOR'), getMyTodayAttendance);
router.get('/my-summary', requireRole('DOCTOR'), getMyAttendanceSummary);

// Hospital Admin monitoring
router.get('/hospital/today', requireRole('ADMIN'), getHospitalAttendanceToday);
router.get('/hospital/metrics', requireRole('ADMIN'), getHospitalAttendanceMetrics);

// Application/District Admin monitoring
router.get('/district/summary', requireRole('APPLICATION_ADMIN'), getDistrictAttendanceSummary);
router.get('/district/hospitals', requireRole('APPLICATION_ADMIN'), getDistrictHospitalsStats);

export default router;
