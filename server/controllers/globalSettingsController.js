import * as globalSettingsService from '../services/globalSettingsService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const get = asyncHandler(async (req, res) => {
  const settings = await globalSettingsService.getGlobalSettings();
  res.json({ success: true, data: { settings } });
});

export const update = asyncHandler(async (req, res) => {
  const settings = await globalSettingsService.updateGlobalSettings(req.body);
  res.json({ success: true, data: { settings } });
});
