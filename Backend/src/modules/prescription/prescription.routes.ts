import { Router } from 'express';
import { createPrescription, getPatientPrescriptions, getDoctorPrescriptions, getAllPrescriptionsForHospital } from './prescription.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/roles.middleware.js';

const router = Router();

router.use(authMiddleware);
router.post('/', requireRole('DOCTOR'), createPrescription);
router.get('/patient', requireRole('PATIENT'), getPatientPrescriptions);
router.get('/doctor', requireRole('DOCTOR'), getDoctorPrescriptions);
router.get('/hospital', requireRole('ADMIN', 'DOCTOR', 'NURSE', 'PHARMACIST'), getAllPrescriptionsForHospital);

export default router;
