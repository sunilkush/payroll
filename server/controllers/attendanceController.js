import * as attendanceService from '../services/attendanceService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const requestMeta = (req) => ({ ip: req.ip, userAgent: req.get('user-agent') });

export const punchIn = asyncHandler(async (req, res) => {
  const attendance = await attendanceService.punchIn(req.user, req.body, requestMeta(req));
  res.status(201).json({ success: true, data: { attendance } });
});

export const punchOut = asyncHandler(async (req, res) => {
  const attendance = await attendanceService.punchOut(req.user, req.body, requestMeta(req));
  res.json({ success: true, data: { attendance } });
});

export const today = asyncHandler(async (req, res) => {
  const data = await attendanceService.getToday(req.user);
  res.json({ success: true, data });
});

export const todaySummary = asyncHandler(async (req, res) => {
  const data = await attendanceService.getTodaySummary();
  res.json({ success: true, data });
});

export const monthly = asyncHandler(async (req, res) => {
  const data = await attendanceService.getMonthly({ requester: req.user, ...req.query });
  res.json({ success: true, data });
});

export const report = asyncHandler(async (req, res) => {
  const data = await attendanceService.getReport(req.query.month);
  res.json({ success: true, data });
});
