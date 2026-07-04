import { Router } from 'express';
import { login, register, logout } from './auth.controller.js';
import { loginLimiter, registerLimiter } from '../../middleware/rateLimiter.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';

const router = Router();

// Endpoint Mapping
router.post('/login', loginLimiter, login);
router.post('/register', registerLimiter, register);

// Restricted Access
router.post('/logout', authMiddleware, logout);

export default router;