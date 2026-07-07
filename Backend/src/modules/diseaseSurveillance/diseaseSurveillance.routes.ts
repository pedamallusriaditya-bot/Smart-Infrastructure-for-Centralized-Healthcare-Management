import { Router } from 'express';
import {
  getSurveillanceStatus,
  getSurveillanceTrends,
  triggerSurveillanceCheck
} from './diseaseSurveillance.controller.js';

const router = Router();

router.get('/status', getSurveillanceStatus);
router.get('/trends', getSurveillanceTrends);
router.post('/trigger', triggerSurveillanceCheck);

export default router;
