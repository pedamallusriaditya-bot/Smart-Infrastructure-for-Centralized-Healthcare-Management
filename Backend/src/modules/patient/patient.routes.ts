import {Router} from 'express';
import {
getPatientProfile,
updatePatientProfile,
getMedicalHistory,
getPatientQR
} from './patient.controller.js';
import {authMiddleware} from '../../middleware/auth.middleware.js';
import {requireRole} from '../../middleware/roles.middleware.js';
import {validate} from '../../middleware/validate.middleware.js';
import {updatePatientSchema} from '../../schemas/validation.schema.js';

const router=Router();

router.use(authMiddleware);

router.use(
requireRole('PATIENT')
);

router.get(
'/profile',
getPatientProfile
);

router.put(
'/profile',
validate(updatePatientSchema),
updatePatientProfile
);

router.get(
'/medical-history',
getMedicalHistory
);

router.get(
'/qr',
getPatientQR
);

export default router;