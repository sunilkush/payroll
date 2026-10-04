import * as companyService from '../services/companyService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (req, res) => {
  const data = await companyService.listCompanies(req.query);
  res.json({ success: true, data });
});

export const create = asyncHandler(async (req, res) => {
  const data = await companyService.createCompany(req.body);
  res.status(201).json({ success: true, data });
});

export const getOne = asyncHandler(async (req, res) => {
  const data = await companyService.getCompany(req.params.id);
  res.json({ success: true, data });
});

export const update = asyncHandler(async (req, res) => {
  const company = await companyService.updateCompany(req.params.id, req.body);
  res.json({ success: true, data: { company } });
});

export const setStatus = asyncHandler(async (req, res) => {
  const company = await companyService.setCompanyStatus(req.params.id, req.body.isActive);
  res.json({ success: true, data: { company } });
});

export const createAdmin = asyncHandler(async (req, res) => {
  const admin = await companyService.createAdmin(req.params.id, req.body);
  res.status(201).json({ success: true, data: { admin } });
});

export const updateAdmin = asyncHandler(async (req, res) => {
  const admin = await companyService.updateAdmin(req.params.id, req.params.adminId, req.body);
  res.json({ success: true, data: { admin } });
});
