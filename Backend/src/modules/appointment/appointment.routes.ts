import { Router } from "express";
import {
  getAppointments,
  createAppointment,
  updateAppointmentStatus,
} from "./appointment.controller.js";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { requireRole } from "../../middleware/roles.middleware.js";

const router = Router();

router.use(authMiddleware);

router.get("/", getAppointments);

router.post(
  "/",
  requireRole("PATIENT"),
  createAppointment
);

router.patch(
  "/:id/status",
  requireRole("DOCTOR", "ADMIN"),
  updateAppointmentStatus
);

export default router;