import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/roles.middleware.js';
import {
  getPharmacistProfile,
  getPharmacyInventory,
  getDashboardSummary,
  getPrescriptionsQueue,
  dispensePrescription,
  cancelPrescription,
  receiveMedicineStock
} from './pharmacy.controller.js';

const router = Router();

// Apply authentication and role check to all pharmacy routes
router.use(authMiddleware);
router.use(requireRole('PHARMACIST'));

router.get('/profile', getPharmacistProfile);
router.get('/inventory', getPharmacyInventory);
router.get('/summary', getDashboardSummary);
router.get('/prescriptions', getPrescriptionsQueue);
router.post('/dispense', dispensePrescription);
router.post('/cancel', cancelPrescription);
router.post('/restock', receiveMedicineStock);

export default router;
