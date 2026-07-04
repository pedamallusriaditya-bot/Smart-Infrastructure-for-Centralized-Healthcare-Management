import { Router } from 'express';
import { getHospitals, getDepartmentsByHospital } from './hospital.controller.js';

const router = Router();

// This becomes /api/v1/hospitals/
router.get('/', getHospitals);

// This becomes /api/v1/hospitals/:hospitalId/departments
// Ensure there is NO leading slash in front of :hospitalId
router.get('/:hospitalId/departments', getDepartmentsByHospital);

export default router;