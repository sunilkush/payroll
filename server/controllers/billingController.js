import * as billingService from '../services/billingService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const get = asyncHandler(async (req, res) => {
  const data = await billingService.getBilling();
  res.json({ success: true, data });
});

export const requestUpgrade = asyncHandler(async (req, res) => {
  const request = await billingService.requestUpgrade(req.user, req.body);
  res.status(201).json({ success: true, data: { request } });
});

export const cancelRequest = asyncHandler(async (req, res) => {
  await billingService.cancelUpgradeRequest();
  res.json({ success: true });
});
