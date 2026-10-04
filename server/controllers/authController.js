import * as authService from '../services/authService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const login = asyncHandler(async (req, res) => {
  const data = await authService.login(req.body);
  res.json({ success: true, data });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { user: req.user, company: req.company } });
});
