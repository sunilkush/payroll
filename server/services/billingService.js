import { Company } from '../models/Company.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import {
  COMPANY_PLANS,
  PLAN_ORDER,
  PLAN_REQUEST_STATUS,
  ROLES,
  SETTING_FEATURE,
} from '../utils/constants.js';
import { getTenantId } from '../utils/tenantContext.js';
import { planFeatures, planStaffLimit } from './planService.js';
import { paymentsEnabled } from './razorpayService.js';
import { SUBSCRIPTION_STATUS, paidPeriodChange, quoteFor, subscriptionOf } from './subscriptionService.js';

// Plan aur upgrade. Online payment abhi nahi hai: admin upgrade ki request bhejta hai,
// Super Admin (payment milne ke baad) use manzoor karke plan badalta hai.
// Daam mahine ka dikhta hai; payment ek saal ki + 18% GST (subscriptionService.quoteFor).

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
    staffLimit: planStaffLimit(company.plan),
    activeStaff,
    features: planFeatures(company.plan),
    request: company.planRequest?.status ? company.planRequest : null,
    subscription: subscriptionOf(company), // { status, endsAt, daysLeft }
    // Har plan ka payment: { monthlyPrice, months, subtotal, gstPercent, gst, total } ya null (Free / Custom)
    quotes: Object.fromEntries(PLAN_ORDER.map((plan) => [plan, quoteFor(plan)])),
    // Kaun sa plan abhi liya ja sakta hai: { STARTER: true, ... } (assertCanChoose ka hi rule, taaki page alag se na soche)
    canChoose: Object.fromEntries(PLAN_ORDER.map((plan) => [plan, canChoose(company, plan)])),
    // Razorpay ki keys lagi hon tabhi "Pay" dikhta hai; warna request wala tareeka.
    onlinePayment: paymentsEnabled(),
    billing: company.billing ?? {}, // pichhli baar bhara hua GSTIN / state
  };
}

// Kaun sa plan liya ja sakta hai (request aur online payment dono par yahi rule):
//   - jisne abhi tak kabhi payment nahi ki (free trial chal raha hai ya khatam hua): koi bhi paid plan, chhota bhi.
//     Trial kisi bade plan par chala ho to bhi user chhota plan kharid sakta hai.
//   - warna: bada plan (upgrade), ya subscription wali company ke liye apna hi paid plan (renew).
export function assertCanChoose(company, plan) {
  const neverPaid = Boolean(company.subscription?.trialEndsAt) && !company.subscription.paidUntil;
  if (neverPaid && plan !== COMPANY_PLANS.FREE) return;
  const step = PLAN_ORDER.indexOf(plan) - PLAN_ORDER.indexOf(company.plan);
  const canRenew = plan !== COMPANY_PLANS.FREE && subscriptionOf(company).status !== SUBSCRIPTION_STATUS.NONE;
  if (step < 0 || (step === 0 && !canRenew)) {
    throw new ApiError(400, 'Choose a plan higher than your current plan.', [{ field: 'plan', message: 'Choose a higher plan.' }]);
  }
}

function canChoose(company, plan) {
  try {
    assertCanChoose(company, plan);
    return true;
  } catch {
    return false;
  }
}

export async function requestUpgrade(admin, { plan, note }) {
  const company = await getCompanyOrThrow();
  assertCanChoose(company, plan);
  // Filter ke andar hi: ek waqt mein ek hi pending request
  const updated = await Company.findOneAndUpdate(
    { _id: company._id, 'planRequest.status': { $ne: PLAN_REQUEST_STATUS.PENDING } },
    {
      $set: {
        planRequest: {
          plan,
          note: note ?? '',
          amount: quoteFor(plan) ?? undefined, // us waqt ka hisaab: daam baad mein badle to bhi request wahi rahe
          status: PLAN_REQUEST_STATUS.PENDING,
          requestedBy: admin._id,
          requestedAt: new Date(),
        },
      },
    },
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
  const allowed = planFeatures(plan);
  const changes = { plan };
  for (const [setting, feature] of Object.entries(SETTING_FEATURE)) {
    if (!allowed.includes(feature)) changes[`settings.${setting}`] = false;
  }
  return changes;
}

// Super Admin: request manzoor (plan badal jata hai, aur subscription wali company ki expiry us din se ek saal
// ho jati hai: staff ke accounts turant wapas chalu) ya na-manzoor.
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
    ...(approved && paidPeriodChange(company)),
  };
  return Company.findByIdAndUpdate(companyId, { $set: changes }, { new: true });
}

export const isValidPlan = (plan) => Object.values(COMPANY_PLANS).includes(plan);
