import * as settingsService from '../services/settingsService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const get = asyncHandler(async (req, res) => {
  const company = await settingsService.getSettings();
  res.json({ success: true, data: { company } });
});

export const update = asyncHandler(async (req, res) => {
  const company = await settingsService.updateSettings(req.body);
  res.json({ success: true, data: { company } });
});
