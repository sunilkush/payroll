import * as punchCorrectionService from '../services/punchCorrectionService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const request = asyncHandler(async (req, res) => {
  const correction = await punchCorrectionService.requestCorrection(req.user, req.body);
  res.status(201).json({ success: true, data: { correction } });
});

export const list = asyncHandler(async (req, res) => {
  const data = await punchCorrectionService.listCorrections({ requester: req.user, ...req.query });
  res.json({ success: true, data });
});

export const approve = asyncHandler(async (req, res) => {
  const correction = await punchCorrectionService.approveCorrection(req.params.id, req.user, req.body.note);
  res.json({ success: true, data: { correction } });
});

export const reject = asyncHandler(async (req, res) => {
  const correction = await punchCorrectionService.rejectCorrection(req.params.id, req.user, req.body.note);
  res.json({ success: true, data: { correction } });
});

export const cancel = asyncHandler(async (req, res) => {
  const correction = await punchCorrectionService.cancelCorrection(req.params.id, req.user);
  res.json({ success: true, data: { correction } });
});
