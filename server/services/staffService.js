import { Company } from '../models/Company.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { ROLES } from '../utils/constants.js';
import { escapeRegex } from '../utils/escapeRegex.js';
import { getTenantId } from '../utils/tenantContext.js';
import { creditUser } from './leaveService.js';
import { planStaffLimit } from './planService.js';

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
    filter.$or = [
      { name: pattern },
      { email: pattern },
      { employeeCode: pattern },
      { department: pattern },
      { designation: pattern },
    ];
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

// Plan mein jitne active staff ki ijazat hai usse zyada na hon. (Band kiye hue staff nahi ginte.)
async function assertStaffSlot(company) {
  const limit = planStaffLimit(company.plan);
  if (limit === null) return;
  if ((await User.countDocuments({ role: ROLES.STAFF, isActive: true })) >= limit) {
    throw new ApiError(403, `Your plan allows up to ${limit} active staff. Upgrade your plan to add more.`);
  }
}

// Staff ki branch company ki locations mein se hi ho (holidays isi se lagti hain).
function assertBranch(company, branchId) {
  if (!branchId) return;
  if (!company.locations.some((location) => String(location._id) === String(branchId))) {
    const message = 'Choose a branch from your office locations.';
    throw new ApiError(400, message, [{ field: 'branchId', message }]);
  }
}

export async function createStaff(data) {
  const company = await Company.findById(getTenantId());
  assertBranch(company, data.branchId);
  await assertStaffSlot(company);
  const staff = await User.create({ ...data, role: ROLES.STAFF });
  // Naye staff ko joining wale mahine ka leave credit turant mil jata hai
  // (1 tarikh ka cron nikal chuka hota hai).
  await creditUser(staff, company);
  return staff;
}

export const getStaff = (id) => findStaffOrThrow(id);

export async function updateStaff(id, data) {
  const staff = await findStaffOrThrow(id);
  if (data.branchId) assertBranch(await Company.findById(getTenantId()), data.branchId);
  staff.set(data);
  await staff.save(); // save() se password hash hota hai
  return staff;
}

// Staff delete nahi hota (attendance/payroll history bani rehti hai), sirf deactivate hota hai.
export async function setStaffStatus(id, isActive) {
  // Dobara chalu karna bhi ek jagah leta hai.
  if (isActive && !(await findStaffOrThrow(id)).isActive) await assertStaffSlot(await Company.findById(getTenantId()));
  return updateStaff(id, { isActive });
}
