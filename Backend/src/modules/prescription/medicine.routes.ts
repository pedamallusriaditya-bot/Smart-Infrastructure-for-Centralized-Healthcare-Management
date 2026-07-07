import { Router } from 'express';
import { searchMedicines } from './prescription.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';

const router = Router();

router.use(authMiddleware);
router.get('/', searchMedicines);

export default router;
