import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/roles.middleware.js';
import {
  getInventory,
  getInventorySummary,
  getInventoryAlerts,
  resolveInventoryAlert,
  getInventoryItem,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem
} from './inventory.controller.js';

const router = Router();

// All inventory routes require authentication and ADMIN role
router.use(authMiddleware);
router.use(requireRole('ADMIN'));

// Summary & alerts (before /:id to avoid param conflicts)
router.get('/summary', getInventorySummary);
router.get('/alerts', getInventoryAlerts);
router.post('/alerts/:alertId/resolve', resolveInventoryAlert);

// CRUD
router.get('/', getInventory);
router.post('/', createInventoryItem);
router.get('/:id', getInventoryItem);
router.put('/:id', updateInventoryItem);
router.delete('/:id', deleteInventoryItem);

export default router;
