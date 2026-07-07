import { Router } from 'express';
import { 
  getHospitals, 
  getDepartmentsByHospital, 
  getAllHospitalsFull, 
  createHospital, 
  deleteHospital, 
  assignHospitalAdmin,
  getHospitalRoomsAndBeds,
  registerPublicHospital
} from './hospital.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/roles.middleware.js';
import { requireAdminOwnHospital } from '../../middleware/district.middleware.js';

const router = Router();

// Public routes for patient booking/registration
router.get('/', getHospitals);
router.get('/:hospitalId/departments', getDepartmentsByHospital);
router.post('/register-public', registerPublicHospital);

// Rooms: auth required; ADMIN role is additionally scoped to their own hospital
router.get('/:hospitalId/rooms', authMiddleware, requireAdminOwnHospital('hospitalId'), getHospitalRoomsAndBeds);

// Super Admin protected routes
router.get('/all-detail', authMiddleware, requireRole('ADMIN'), getAllHospitalsFull);
router.post('/', authMiddleware, requireRole('ADMIN'), createHospital);
router.delete('/:id', authMiddleware, requireRole('ADMIN'), deleteHospital);
router.post('/:hospitalId/admin', authMiddleware, requireRole('ADMIN'), assignHospitalAdmin);

export default router;