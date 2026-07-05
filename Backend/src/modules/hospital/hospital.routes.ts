import { Router } from 'express';
import { 
  getHospitals, 
  getDepartmentsByHospital, 
  getAllHospitalsFull, 
  createHospital, 
  deleteHospital, 
  assignHospitalAdmin 
} from './hospital.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/roles.middleware.js';

const router = Router();

// Public routes for patient booking/registration
router.get('/', getHospitals);
router.get('/:hospitalId/departments', getDepartmentsByHospital);

// Super Admin protected routes
router.get('/all-detail', authMiddleware, requireRole('ADMIN'), getAllHospitalsFull);
router.post('/', authMiddleware, requireRole('ADMIN'), createHospital);
router.delete('/:id', authMiddleware, requireRole('ADMIN'), deleteHospital);
router.post('/:hospitalId/admin', authMiddleware, requireRole('ADMIN'), assignHospitalAdmin);

export default router;