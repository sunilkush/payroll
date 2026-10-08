import * as accountService from '../services/accountService.js';
import * as authService from '../services/authService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const login = asyncHandler(async (req, res) => {
  const data = await authService.login(req.body);
  res.json({ success: true, data });
});

export const register = asyncHandler(async (req, res) => {
  const data = await authService.register(req.body);
  res.status(201).json({ success: true, data });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { user: req.user, company: req.company } });
});

// ---------- Email verification ----------

export const verifyEmail = asyncHandler(async (req, res) => {
  const user = await accountService.verifyEmail(req.user, req.body.code);
  res.json({ success: true, data: { user } });
});

export const resendVerification = asyncHandler(async (req, res) => {
  await accountService.resendVerificationCode(req.user);
  res.json({ success: true, message: 'A new code has been sent to your email.' });
});

// ---------- Password reset ----------

// Email register ho ya na ho, jawab ek hi: koi ye na jaan sake ki kaun sa email system mein hai.
export const forgotPassword = asyncHandler(async (req, res) => {
  await accountService.requestPasswordReset(req.body.email);
  res.json({ success: true, message: 'If an account exists for this email, a reset link has been sent.' });
});

export const resetPassword = asyncHandler(async (req, res) => {
  await accountService.resetPassword(req.body.token, req.body.password);
  res.json({ success: true, message: 'Your password has been changed. Please log in.' });
});
