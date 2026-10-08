import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import * as authController from '../controllers/authController.js';
import { auth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from '../validators/authValidator.js';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: env.loginRateLimit.windowMin * 60 * 1000,
  max: env.loginRateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Please try again later.' },
});

// Bina login ke khula hai, isliye ek IP se ghante mein thode hi accounts.
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: env.registerRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many accounts created from this network. Please try again later.' },
});

router.post('/login', loginLimiter, validate(loginSchema), authController.login);
router.post('/register', registerLimiter, validate(registerSchema), authController.register);
router.get('/me', auth, authController.me);

// Email verification: login ke baad, 6 ank ka code. Code ka andaza lagana dheema rahe.
const codeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.loginRateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please try again later.' },
});
router.post('/verify-email', auth, codeLimiter, validate(verifyEmailSchema), authController.verifyEmail);
router.post('/resend-verification', auth, codeLimiter, authController.resendVerification);

// Password bhool gaye: email par link. Bina login ke khula hai, isliye register wali hi hadd.
router.post('/forgot-password', registerLimiter, validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', registerLimiter, validate(resetPasswordSchema), authController.resetPassword);

export default router;
