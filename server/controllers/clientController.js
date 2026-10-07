import * as clientService from '../services/clientService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (req, res) => {
  const data = await clientService.listClients(req.query);
  res.json({ success: true, data });
});

export const create = asyncHandler(async (req, res) => {
  const client = await clientService.createClient(req.body);
  res.status(201).json({ success: true, data: { client } });
});

export const getOne = asyncHandler(async (req, res) => {
  const client = await clientService.getClient(req.params.id);
  res.json({ success: true, data: { client } });
});

export const update = asyncHandler(async (req, res) => {
  const client = await clientService.updateClient(req.params.id, req.body);
  res.json({ success: true, data: { client } });
});

export const setStatus = asyncHandler(async (req, res) => {
  const client = await clientService.setClientStatus(req.params.id, req.body.isActive);
  res.json({ success: true, data: { client } });
});
