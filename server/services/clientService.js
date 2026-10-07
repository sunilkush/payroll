import { Client } from '../models/Client.js';
import { ApiError } from '../utils/ApiError.js';
import { escapeRegex } from '../utils/escapeRegex.js';

// companyId yahan kahin nahi likha: tenantPlugin har query ko current company tak limit karta hai.

async function findClientOrThrow(id) {
  const client = await Client.findById(id);
  if (!client) throw new ApiError(404, 'Client not found.');
  return client;
}

const duplicateName = () =>
  new ApiError(409, 'A client with this name already exists.', [{ field: 'name', message: 'This is already in use' }]);

export async function listClients({ search, status, page, limit }) {
  const filter = {};
  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ name: pattern }, { contactPerson: pattern }, { phone: pattern }];
  }
  // Status tabs ki ginti: search lagu hota hai, status nahi (taaki har tab par apni ginti dikhe).
  const searchOnly = { ...filter };
  if (status === 'active') filter.isActive = true;
  if (status === 'inactive') filter.isActive = false;

  const [items, total, all, active] = await Promise.all([
    Client.find(filter)
      .sort({ name: 1 })
      .collation({ locale: 'en', strength: 2 })
      .skip((page - 1) * limit)
      .limit(limit),
    Client.countDocuments(filter),
    Client.countDocuments(searchOnly),
    Client.countDocuments({ ...searchOnly, isActive: true }),
  ]);

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    counts: { all, active, inactive: all - active },
  };
}

export async function createClient(data) {
  try {
    return await Client.create(data);
  } catch (err) {
    if (err.code === 11000) throw duplicateName();
    throw err;
  }
}

export const getClient = (id) => findClientOrThrow(id);

export async function updateClient(id, data) {
  const client = await findClientOrThrow(id);
  client.set(data);
  try {
    await client.save();
  } catch (err) {
    if (err.code === 11000) throw duplicateName();
    throw err;
  }
  return client;
}

// Client delete nahi hota (purani meetings usse judi hain), sirf band hota hai.
export const setClientStatus = (id, isActive) => updateClient(id, { isActive });
