import { Router } from "express";
import {
  getAppointments,
  createAppointment,
  updateAppointmentStatus,
} from "./appointment.controller.js";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { requireRole } from "../../middleware/roles.middleware.js";
import { checkOwnership } from '../../middleware/ownership.middleware.js';

const router = Router();

// Global Protection: Every route in this domain requires a valid token
router.use(authMiddleware);

/**
 * GET /api/v1/appointments
 * Scoping: Patients see only theirs, Doctors see theirs, Admin see all.
 */
router.get("/", getAppointments);

router.get('/:id', 
  authMiddleware, 
  checkOwnership('APPOINTMENT'), 
  getAppointments
);
/**
 * POST /api/v1/appointments
 * Restricted to Patients creating their own bookings.
 */
router.post(
  "/",
  requireRole("PATIENT"),
  createAppointment
);

/**
 * PATCH /api/v1/appointments/:id/status
 * Logic Check: 
 * - Patients can only 'CANCEL' their own records.
 * - Doctors can manage appointments assigned to them.
 * - Admin has full control.
 * Because access depends on specific entity ownership, we apply role restrictions
 * inside the SERVICE logic instead of this static middleware.
 */
router.patch(
  "/:id/status",
  updateAppointmentStatus
);

export default router;