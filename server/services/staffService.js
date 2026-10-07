import { Company } from '../models/Company.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { ROLES } from '../utils/constants.js';
import { escapeRegex } from '../utils/escapeRegex.js';
import { getTenantId } from '../utils/tenantContext.js';
import { creditUser } from './leaveService.js';

// Yahan companyId kahin nahi likha: tenant middleware + tenantPlugin har query ko
// apne aap current company tak limit karte hain aur naye staff par companyId lagate hain.

async function findStaffOrThrow(id) {
  const staff = await User.findOne({ _id: id, role: ROLES.STAFF });
  if (!staff) throw new ApiError(404, 'Staff member not found.');
  return staff;
}

export async function listStaff({ search, status, salesManager, page, limit }) {
  const filter = { role: ROLES.STAFF };
  if (salesManager) filter.isSalesManager = true;
  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ name: pattern }, { email: pattern }, { employeeCode: pattern }];
  }
  if (status === 'active') filter.isActive = true;
  if (status === 'inactive') filter.isActive = false;

  // Status tabs ki ginti: search lagu hota hai, status nahi (taaki har tab par apni ginti dikhe).
  const { isActive: _status, ...searchOnly } = filter;
  const [items, total, all, active] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    User.countDocuments(filter),
    User.countDocuments(searchOnly),
    User.countDocuments({ ...searchOnly, isActive: true }),
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

export async function createStaff(data) {
  const staff = await User.create({ ...data, role: ROLES.STAFF });
  // Naye staff ko joining wale mahine ka leave credit turant mil jata hai
  // (1 tarikh ka cron nikal chuka hota hai).
  const company = await Company.findById(getTenantId());
  await creditUser(staff, company);
  return staff;
}

export const getStaff = (id) => findStaffOrThrow(id);

export async function updateStaff(id, data) {
  const staff = await findStaffOrThrow(id);
  staff.set(data);
  await staff.save(); // save() se password hash hota hai
  return staff;
}

// Staff delete nahi hota (attendance/payroll history bani rehti hai), sirf deactivate hota hai.
export const setStaffStatus = (id, isActive) => updateStaff(id, { isActive });
