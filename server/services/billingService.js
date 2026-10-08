import { Company } from '../models/Company.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import {
  COMPANY_PLANS,
  PLAN_FEATURES,
  PLAN_ORDER,
  PLAN_REQUEST_STATUS,
  PLAN_STAFF_LIMIT,
  ROLES,
  SETTING_FEATURE,
} from '../utils/constants.js';
import { getTenantId } from '../utils/tenantContext.js';

// Plan aur upgrade. Online payment abhi nahi hai: admin upgrade ki request bhejta hai,
// Super Admin (payment milne ke baad) use manzoor karke plan badalta hai.

async function getCompanyOrThrow() {
  const company = await Company.findById(getTenantId());
  if (!company) throw new ApiError(404, 'Company not found.');
  return company;
}

// Admin ka "Plan & Billing" page
export async function getBilling() {
  const company = await getCompanyOrThrow();
  const activeStaff = await User.countDocuments({ role: ROLES.STAFF, isActive: true });
  return {
    plan: company.plan,
    staffLimit: PLAN_STAFF_LIMIT[company.plan],
    activeStaff,
    features: PLAN_FEATURES[company.plan],
    request: company.planRequest?.status ? company.planRequest : null,
  };
}

export async function requestUpgrade(admin, { plan, note }) {
  const company = await getCompanyOrThrow();
  if (PLAN_ORDER.indexOf(plan) <= PLAN_ORDER.indexOf(company.plan)) {
    throw new ApiError(400, 'Choose a plan higher than your current plan.', [{ field: 'plan', message: 'Choose a higher plan.' }]);
  }
  // Filter ke andar hi: ek waqt mein ek hi pending request
  const updated = await Company.findOneAndUpdate(
    { _id: company._id, 'planRequest.status': { $ne: PLAN_REQUEST_STATUS.PENDING } },
    { $set: { planRequest: { plan, note: note ?? '', status: PLAN_REQUEST_STATUS.PENDING, requestedBy: admin._id, requestedAt: new Date() } } },
    { new: true }
  );
  if (!updated) throw new ApiError(409, 'You already have an upgrade request waiting for approval.');
  return updated.planRequest;
}

export async function cancelUpgradeRequest() {
  const updated = await Company.findOneAndUpdate(
    { _id: getTenantId(), 'planRequest.status': PLAN_REQUEST_STATUS.PENDING },
    { $unset: { planRequest: 1 } },
    { new: true }
  );
  if (!updated) throw new ApiError(404, 'There is no pending upgrade request.');
}

// Plan badalne par jo settings naye plan mein nahi aati wo band ho jati hain (jaise Free par leave / PF / sales),
// taaki chhote plan par bada feature chalta na reh jaye. Return: $set ke liye changes.
export function planChange(plan) {
  const allowed = PLAN_FEATURES[plan];
  const changes = { plan };
  for (const [setting, feature] of Object.entries(SETTING_FEATURE)) {
    if (!allowed.includes(feature)) changes[`settings.${setting}`] = false;
  }
  return changes;
}

// Super Admin: request manzoor (plan badal jata hai) ya na-manzoor.
export async function decidePlanRequest(companyId, { action, note }) {
  const company = await Company.findOne({ _id: companyId, 'planRequest.status': PLAN_REQUEST_STATUS.PENDING });
  if (!company) {
    if (!(await Company.exists({ _id: companyId }))) throw new ApiError(404, 'Company not found.');
    throw new ApiError(409, 'This company has no pending upgrade request.');
  }
  const approved = action === 'approve';
  const changes = {
    'planRequest.status': approved ? PLAN_REQUEST_STATUS.APPROVED : PLAN_REQUEST_STATUS.REJECTED,
    'planRequest.decidedAt': new Date(),
    'planRequest.decisionNote': note ?? '',
    ...(approved && planChange(company.planRequest.plan)),
  };
  return Company.findByIdAndUpdate(companyId, { $set: changes }, { new: true });
}

export const isValidPlan = (plan) => Object.values(COMPANY_PLANS).includes(plan);
