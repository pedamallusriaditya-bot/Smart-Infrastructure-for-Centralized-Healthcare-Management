import { Router } from 'express';
import * as controller from './patient.controller.js';
import { processPatientChat } from './patientAi.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/roles.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { updatePatientSchema } from '../../schemas/patient.schema.js';

const router = Router();

// Every route in this file requires authentication
router.use(authMiddleware);

/**
 * --- PATIENT SELF-SERVICE ROUTES ---
 * Only a logged-in Patient can access these to view their own data.
 */

router.get(
  '/profile', 
  requireRole('PATIENT'), 
  controller.getPatientProfile
);

router.put(
  '/profile', 
  requireRole('PATIENT'), 
  validate(updatePatientSchema), 
  controller.updatePatientProfile
);

router.get(
  '/medical-history', 
  requireRole('PATIENT'), 
  controller.getMedicalHistory
);

router.get(
  '/qr', 
  requireRole('PATIENT'), 
  controller.getPatientQR
);

router.get(
  '/care-timeline',
  requireRole('PATIENT'),
  controller.getCareTimeline
);

router.post(
  '/ai/chat',
  requireRole('PATIENT'),
  processPatientChat
);

/**
 * --- CLINICAL ACCESS ROUTES ---
 * Specifically for Doctors looking up patients during consultation.
 */

router.get(
  '/:patientId/qr', 
  requireRole('DOCTOR'), 
  controller.getPatientQRForDoctor
);

// New Clinical route added during audit for Doctors to see profiles
router.get(
  '/:patientId/view', 
  requireRole('DOCTOR'), 
  controller.getPatientProfileForDoctor
);

export default router;