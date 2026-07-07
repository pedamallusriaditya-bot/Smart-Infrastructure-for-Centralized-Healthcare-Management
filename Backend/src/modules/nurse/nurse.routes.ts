import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/roles.middleware.js';
import {
  getNurseProfile,
  getAdmittedPatients,
  getPrescriptions,
  getMedicationHistory,
  recordVitalSigns,
  updateNursingNotes,
  administerMedication
} from './nurse.controller.js';

const router = Router();

// Apply authentication and role check to all nurse routes
router.use(authMiddleware);
router.use(requireRole('NURSE'));

router.get('/profile', getNurseProfile);
router.get('/patients', getAdmittedPatients);
router.get('/prescriptions', getPrescriptions);
router.get('/patients/:patientId/history', getMedicationHistory);
router.post('/administer', administerMedication);
router.post('/vitals', recordVitalSigns);
router.post('/notes', updateNursingNotes);

export default router;
