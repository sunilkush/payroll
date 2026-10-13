import { Settings } from '../models/Settings.js';
import { FEATURE_LABEL, PLAN_ORDER } from '../utils/constants.js';

// Packages (plans) Super Admin ke haath mein hain: naam, daam, staff ki hadd, features, aur billing ke niyam
// (kitne mahine ki payment, GST %, free trial ke din). Sab Global Settings ki document mein rehta hai;
// .env ke numbers sirf pehli baar ke defaults hain.
//
// Plan ki jaankari har request par kai jagah chahiye (feature ki rok, staff ki hadd...), isliye ek copy memory
// mein rehti hai. Super Admin ke badalte hi taaza hoti hai, aur waise bhi thodi-thodi der mein
// (ek se zyada server chal rahe hon to doosre server tak badlav isi se pahunchta hai).

const MAX_AGE_MS = 30 * 1000;

// Database ki document -> saada object. Document na ho to schema ke defaults.
function snapshot(settings) {
  const { plans, billing } = (settings ?? new Settings()).toObject();
  return { plans, billing };
}

let current = snapshot(null);
let loadedAt = 0;

// force: Super Admin ne abhi-abhi badla hai. Warna purani copy MAX_AGE_MS tak chalti hai.
export async function refreshPlans({ force = false } = {}) {
  if (!force && Date.now() - loadedAt < MAX_AGE_MS) return;
  current = snapshot(await Settings.findOne({ key: 'global' }));
  loadedAt = Date.now();
}

// { name, subtitle, monthlyPrice (null = Custom), staffLimit (null = koi hadd nahi), features: [] }
export const planOf = (plan) => current.plans[plan];
export const planLabel = (plan) => planOf(plan)?.name ?? plan;
export const planFeatures = (plan) => planOf(plan)?.features ?? [];
export const planStaffLimit = (plan) => planOf(plan)?.staffLimit ?? null;

// { months, gstPercent, trialDays }
export const billingTerms = () => current.billing;

// "<Feature> is available on the <Plan> plan and above" (jab feature kisi plan mein ho hi na to bina plan ke naam ke).
export function featureLockedMessage(feature) {
  const minPlan = PLAN_ORDER.find((plan) => planFeatures(plan).includes(feature));
  return minPlan
    ? `${FEATURE_LABEL[feature]} is available on the ${planLabel(minPlan)} plan and above. Upgrade your plan to use it.`
    : `${FEATURE_LABEL[feature]} is not available on your plan.`;
}
export const featureMinPlanLabel = (feature) => {
  const minPlan = PLAN_ORDER.find((plan) => planFeatures(plan).includes(feature));
  return minPlan ? planLabel(minPlan) : null;
};

// Website (landing page, bina login) aur Billing page ke liye: saare plans chhote se bade tak.
export async function getPublicPlans() {
  await refreshPlans();
  return {
    plans: PLAN_ORDER.map((code) => ({ code, ...planOf(code) })),
    billing: billingTerms(),
    featureLabels: FEATURE_LABEL,
  };
}
