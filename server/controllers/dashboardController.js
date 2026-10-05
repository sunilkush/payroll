import * as dashboardService from '../services/dashboardService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ROLES } from '../utils/constants.js';

// Ek hi URL, role ke hisaab se alag dashboard.
export const get = asyncHandler(async (req, res) => {
  let data;
  if (req.user.role === ROLES.SUPER_ADMIN) data = await dashboardService.getSuperAdminDashboard();
  else if (req.user.role === ROLES.ADMIN) data = await dashboardService.getAdminDashboard(req.query);
  else data = await dashboardService.getStaffDashboard(req.user);
  res.json({ success: true, data });
});

export const notifications = asyncHandler(async (req, res) => {
  const items = await dashboardService.getNotifications(req.user);
  res.json({ success: true, data: { items } });
});
