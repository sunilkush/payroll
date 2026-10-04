import * as staffService from '../services/staffService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (req, res) => {
  const data = await staffService.listStaff(req.query);
  res.json({ success: true, data });
});

export const create = asyncHandler(async (req, res) => {
  const staff = await staffService.createStaff(req.body);
  res.status(201).json({ success: true, data: { staff } });
});

export const getOne = asyncHandler(async (req, res) => {
  const staff = await staffService.getStaff(req.params.id);
  res.json({ success: true, data: { staff } });
});

export const update = asyncHandler(async (req, res) => {
  const staff = await staffService.updateStaff(req.params.id, req.body);
  res.json({ success: true, data: { staff } });
});

export const setStatus = asyncHandler(async (req, res) => {
  const staff = await staffService.setStaffStatus(req.params.id, req.body.isActive);
  res.json({ success: true, data: { staff } });
});
