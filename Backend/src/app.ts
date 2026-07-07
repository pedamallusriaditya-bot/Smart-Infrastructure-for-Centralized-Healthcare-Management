import './config/env.config.js';
import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import crypto from 'crypto';
import hospitalRoutes from './modules/hospital/hospital.routes.js';
import { env } from './config/env.config.js';
import { swaggerSpec } from './config/swagger.js';
import admissionRoutes from './modules/admission/admission.routes.js';
// Module Routes
import authRoutes from './modules/auth/auth.routes.js';
import patientRoutes from './modules/patient/patient.routes.js';
import doctorRoutes from './modules/doctor/doctor.routes.js';
import appointmentRoutes from './modules/appointment/appointment.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import labRoutes from './modules/lab/lab.routes.js';
import prescriptionRoutes from './modules/prescription/prescription.routes.js';
import medicineRoutes from './modules/prescription/medicine.routes.js';
import appAdminRoutes from './modules/appAdmin/appAdmin.routes.js';
import inventoryRoutes from './modules/inventory/inventory.routes.js';
import nurseRoutes from './modules/nurse/nurse.routes.js';
import pharmacyRoutes from './modules/pharmacy/pharmacy.routes.js';
import attendanceRoutes from './modules/attendance/attendance.routes.js';
import diagnosticRoutes from './modules/diagnostic/diagnostic.routes.js';
import analyticsRoutes from './modules/analytics/analytics.routes.js';
import inventoryAiRoutes from './modules/inventory/inventory-ai.routes.js';
import demandRoutes from './modules/demand/demand.routes.js';
import referralRoutes from './modules/referral/referral.routes.js';
import diseaseSurveillanceRoutes from './modules/diseaseSurveillance/diseaseSurveillance.routes.js';


import { authMiddleware } from './middleware/auth.middleware.js';
import { requireRole } from './middleware/roles.middleware.js';

// Global API Routes
import apiRoutes from './routes/v1/api.routes.js';

// Middleware
import { addRequestId } from './middleware/request.middleware.js';
import { errorMiddleware, AppError } from './middleware/error.middleware.js';
import { apiLimiter } from './middleware/rateLimiter.js';

// Utilities
import { logger } from './lib/logger.js';

const app: Application = express();

// 1. TRUST PROXY (Critical for Rate Limiting in Production)
app.set('trust proxy', 1);

// 2. REQUEST ID & TRACKING (Audit requirement)
app.use(addRequestId);

// 3. SECURITY & HEADERS
app.use(helmet());
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  })
);

// 4. BODY PARSING (Hardened with size limits to prevent DoS)
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// 5. STRUCTURED LOGGING
app.use(
  morgan('combined', {
    stream: {
      write: (message: string) => logger.info(message.trim()),
    },
  })
);

// 6. GLOBAL RATE LIMITING
app.use('/api', apiLimiter);

// 7. SWAGGER DOCUMENTATION (Dev only)
if (env.NODE_ENV !== 'production') {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

// 8. HEALTH CHECK (For Cloud/Orchestrators)
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    message: 'API is running and reachable',
    timestamp: new Date().toISOString()
  });
});

const API_PREFIX = '/api/v1';
app.use(`${API_PREFIX}/admissions`, admissionRoutes);
app.use(`${API_PREFIX}/prescriptions`, prescriptionRoutes);
app.use(`${API_PREFIX}/medicines`, medicineRoutes);
// 9. PRIMARY DOMAIN ROUTES
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/patients`, patientRoutes);
app.use(`${API_PREFIX}/doctors`, doctorRoutes);
app.use(`${API_PREFIX}/appointments`, appointmentRoutes);
app.use(`${API_PREFIX}/admin`, adminRoutes);
app.use(`${API_PREFIX}/timeline`, apiRoutes);
app.use(`${API_PREFIX}/lab`, labRoutes);
app.use(`${API_PREFIX}/hospitals`, hospitalRoutes);
app.use(`${API_PREFIX}/app-admin`, authMiddleware, requireRole('APPLICATION_ADMIN'), appAdminRoutes);
app.use(`${API_PREFIX}/inventory`, inventoryRoutes);
app.use(`${API_PREFIX}/nurse`, nurseRoutes);
app.use(`${API_PREFIX}/pharmacy`, pharmacyRoutes);
app.use(`${API_PREFIX}/attendance`, attendanceRoutes);
app.use(`${API_PREFIX}/diagnostics`, diagnosticRoutes);
app.use(`${API_PREFIX}/analytics`, analyticsRoutes);
app.use(`${API_PREFIX}/inventory/ai`, inventoryAiRoutes);
app.use(`${API_PREFIX}/demand`, demandRoutes);
app.use(`${API_PREFIX}/referrals`, authMiddleware, referralRoutes);
app.use(`${API_PREFIX}/disease-surveillance`, authMiddleware, requireRole('APPLICATION_ADMIN'), diseaseSurveillanceRoutes);



// 11. GLOBAL ERROR HANDLING MIDDLEWARE (Last item)
app.use(errorMiddleware);

app.all('*', (req: Request, _res: Response, next: NextFunction) => {
  next(new AppError(404, `Route ${req.originalUrl} not found`));
});

export default app;