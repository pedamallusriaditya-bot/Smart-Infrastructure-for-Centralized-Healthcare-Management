import { Router } from 'express';
import { 
  getHospitals, 
  approveHospital, 
  rejectHospital, 
  getDashboardStats,
  getHospitalPerformanceScoring,
  getNotifications,
  markNotificationRead,
  suspendHospital,
  activateHospital
} from './appAdmin.controller.js';
import {
  getSystemStatus,
  generateRecommendations,
  listTransfers,
  approveTransfer,
  rejectTransfer
} from './redistribution.controller.js';

const router = Router();

router.get('/hospitals', getHospitals);
router.post('/hospitals/:id/approve', approveHospital);
router.post('/hospitals/:id/reject', rejectHospital);
router.post('/hospitals/:id/suspend', suspendHospital);
router.post('/hospitals/:id/activate', activateHospital);
router.get('/dashboard/stats', getDashboardStats);

// Performance & Scoring
router.get('/performance', getHospitalPerformanceScoring);

// Notifications Management
router.get('/notifications', getNotifications);
router.post('/notifications/:id/read', markNotificationRead);

// Redistribution System
router.get('/redistribution/status', getSystemStatus);
router.post('/redistribution/recommendations', generateRecommendations);
router.get('/redistribution/transfers', listTransfers);
router.post('/redistribution/transfers/:id/approve', approveTransfer);
router.post('/redistribution/transfers/:id/reject', rejectTransfer);

export default router;
