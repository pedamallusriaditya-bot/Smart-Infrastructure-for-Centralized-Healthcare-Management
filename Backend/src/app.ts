import './config/env.config.js';

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';

import { env } from './config/env.config.js';
import { swaggerSpec } from './config/swagger.js';

import authRoutes from './modules/auth/auth.routes.js';
import patientRoutes from './modules/patient/patient.routes.js';
import doctorRoutes from './modules/doctor/doctor.routes.js';
import appointmentRoutes from './modules/appointment/appointment.routes.js';
import emergencyRoutes from './modules/emergency/emergency.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';

import apiRoutes from './routes/v1/api.routes.js';

import { addRequestId } from './middleware/request.middleware.js';
import { errorMiddleware, AppError } from './middleware/error.middleware.js';
import { apiLimiter } from './middleware/rateLimiter.js';

import { logger } from './lib/logger.js';

const app: Application = express();

// trust proxy (for rate limits, proxies, etc.)
app.set('trust proxy', 1);

// request id middleware
app.use(addRequestId);

// security middleware
app.use(helmet());

app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  })
);

// body parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// logging
app.use(
  morgan('combined', {
    stream: {
      write: (message: string) => logger.info(message.trim()),
    },
  })
);

// rate limiter
app.use('/api', apiLimiter);

// swagger (dev only)
if (env.NODE_ENV !== 'production') {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

// health check
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    message: 'API is running',
  });
});

const API_PREFIX = '/api/v1';

// routes
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/patients`, patientRoutes);
app.use(`${API_PREFIX}/doctors`, doctorRoutes);
app.use(`${API_PREFIX}/appointments`, appointmentRoutes);
app.use(`${API_PREFIX}/emergencies`, emergencyRoutes);
app.use(`${API_PREFIX}/admin`, adminRoutes);
app.use(`${API_PREFIX}/timeline`, apiRoutes);

// 404 handler
app.all('*', (req: Request, _res: Response, next: NextFunction) => {
  next(new AppError(404, `Route ${req.originalUrl} not found`));
});

// global error handler (must be last)
app.use(errorMiddleware);

export default app;