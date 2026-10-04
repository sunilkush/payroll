import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import * as authController from '../controllers/authController.js';
import { auth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { loginSchema } from '../validators/authValidator.js';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: env.loginRateLimit.windowMin * 60 * 1000,
  max: env.loginRateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Please try again later.' },
});

router.post('/login', loginLimiter, validate(loginSchema), authController.login);
router.get('/me', auth, authController.me);

export default router;
