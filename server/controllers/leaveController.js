import * as leaveService from '../services/leaveService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const apply = asyncHandler(async (req, res) => {
  const data = await leaveService.applyLeave(req.user, req.body);
  res.status(201).json({ success: true, data });
});

export const list = asyncHandler(async (req, res) => {
  const data = await leaveService.listLeaves({ requester: req.user, ...req.query });
  res.json({ success: true, data });
});

export const balance = asyncHandler(async (req, res) => {
  const data = await leaveService.getBalance(req.user);
  res.json({ success: true, data: { balance: data } });
});

export const approve = asyncHandler(async (req, res) => {
  const leave = await leaveService.approveLeave(req.params.id, req.user, req.body.note);
  res.json({ success: true, data: { leave } });
});

export const reject = asyncHandler(async (req, res) => {
  const leave = await leaveService.rejectLeave(req.params.id, req.user, req.body.note);
  res.json({ success: true, data: { leave } });
});

export const cancel = asyncHandler(async (req, res) => {
  const leave = await leaveService.cancelLeave(req.params.id, req.user);
  res.json({ success: true, data: { leave } });
});
