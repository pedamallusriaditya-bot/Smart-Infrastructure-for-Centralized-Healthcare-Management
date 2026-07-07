import { Router } from 'express';
import {
  suggestHospitalsController,
  createReferralController,
  getReferralHistoryController,
  getDoctorReferralsController
} from './referral.controller.js';

const router = Router();

router.get('/suggest', suggestHospitalsController);
router.post('/create', createReferralController);
router.get('/history/:patientId', getReferralHistoryController);
router.get('/history', getDoctorReferralsController);

export default router;
