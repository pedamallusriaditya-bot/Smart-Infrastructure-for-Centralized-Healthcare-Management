import { Router } from 'express';
import {
  getSystemMetrics,
  getLoginAuditHistory,
  deleteUserAccount
} from './admin.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/roles.middleware.js';

const router = Router();

router.use(authMiddleware);
router.use(requireRole('ADMIN'));

router.get(
  '/metrics',
  getSystemMetrics
);

router.get(
  '/audit',
  getLoginAuditHistory
);

router.delete(
  '/users/:id',
  deleteUserAccount
);

export default router;