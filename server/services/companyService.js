import { Company } from '../models/Company.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { ROLES } from '../utils/constants.js';
import { escapeRegex } from '../utils/escapeRegex.js';

// Ye service sirf Super Admin routes se chalti hai (cross-company), isliye yahan
// tenant context nahi hota aur User queries mein companyId khud dena padta hai.

async function findCompanyOrThrow(id) {
  const company = await Company.findById(id);
  if (!company) throw new ApiError(404, 'Company nahi mili.');
  return company;
}

async function assertEmailFree(email) {
  if (await User.exists({ email })) {
    throw new ApiError(409, 'Is email se user pehle se maujood hai.', [
      { field: 'admin.email', message: 'Ye email pehle se use ho raha hai' },
    ]);
  }
}

async function countUsersByCompany(companyIds) {
  const rows = await User.aggregate([
    { $match: { companyId: { $in: companyIds } } },
    { $group: { _id: { companyId: '$companyId', role: '$role' }, count: { $sum: 1 } } },
  ]);
  const counts = new Map();
  for (const row of rows) {
    const key = String(row._id.companyId);
    const entry = counts.get(key) ?? { adminCount: 0, staffCount: 0 };
    if (row._id.role === ROLES.ADMIN) entry.adminCount = row.count;
    if (row._id.role === ROLES.STAFF) entry.staffCount = row.count;
    counts.set(key, entry);
  }
  return counts;
}

export async function listCompanies({ search, status, page, limit }) {
  const filter = {};
  if (search) filter.name = new RegExp(escapeRegex(search), 'i');
  if (status === 'active') filter.isActive = true;
  if (status === 'blocked') filter.isActive = false;

  const [companies, total] = await Promise.all([
    Company.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Company.countDocuments(filter),
  ]);

  const counts = await countUsersByCompany(companies.map((c) => c._id));
  const items = companies.map((company) => ({
    ...company,
    adminCount: 0,
    staffCount: 0,
    ...counts.get(String(company._id)),
  }));

  return { items, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

export async function createCompany({ admin, ...data }) {
  if (admin) await assertEmailFree(admin.email);

  const company = await Company.create(data);
  if (!admin) return { company, admin: null };

  try {
    const adminUser = await User.create({ ...admin, role: ROLES.ADMIN, companyId: company._id });
    return { company, admin: adminUser };
  } catch (err) {
    // Standalone MongoDB mein transaction nahi hota, isliye admin fail ho to company hata do.
    await Company.deleteOne({ _id: company._id });
    throw err;
  }
}

export async function getCompany(id) {
  const company = await findCompanyOrThrow(id);
  const [admins, staffCount] = await Promise.all([
    User.find({ companyId: company._id, role: ROLES.ADMIN }).sort({ createdAt: 1 }),
    User.countDocuments({ companyId: company._id, role: ROLES.STAFF }),
  ]);
  return { company, admins, staffCount };
}

export async function updateCompany(id, data) {
  const company = await Company.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
  if (!company) throw new ApiError(404, 'Company nahi mili.');
  return company;
}

// Block hone par us company ke users ka login aur chalu sessions dono band ho jaate hain
// (authService.assertCanAccess har request par company check karta hai).
export const setCompanyStatus = (id, isActive) => updateCompany(id, { isActive });

export async function createAdmin(companyId, data) {
  const company = await findCompanyOrThrow(companyId);
  await assertEmailFree(data.email);
  return User.create({ ...data, role: ROLES.ADMIN, companyId: company._id });
}

export async function updateAdmin(companyId, adminId, data) {
  const admin = await User.findOne({ _id: adminId, companyId, role: ROLES.ADMIN });
  if (!admin) throw new ApiError(404, 'Admin nahi mila.');

  admin.set(data);
  await admin.save(); // save() se password hash hota hai
  return admin;
}
