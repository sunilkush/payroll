import { Company } from '../models/Company.js';
import { Settings } from '../models/Settings.js';
import { planChange } from './billingService.js';
import { refreshPlans } from './planService.js';

// Global settings ki ek hi document hoti hai; pehli baar maangne par defaults ke saath ban jati hai.
export async function getGlobalSettings() {
  const existing = await Settings.findOne({ key: 'global' });
  if (existing) return existing;
  try {
    return await Settings.create({ key: 'global' });
  } catch (err) {
    if (err.code === 11000) return Settings.findOne({ key: 'global' });
    throw err;
  }
}

// data: { payrollDaysBasis?, pf?: {...}, esi?: {...}, billing?: {...}, plans?: { STARTER: {...}, ... } }
// Sirf bheje gaye keys badalte hain. Purani (pehle se bani) payroll par asar nahi padta, sirf naye generate par.
export async function updateGlobalSettings({ pf, esi, billing, plans, ...rest }) {
  const settings = await getGlobalSettings();
  const changes = { ...rest };
  for (const [group, values] of Object.entries({ pf, esi, billing })) {
    for (const [key, value] of Object.entries(values ?? {})) changes[`${group}.${key}`] = value;
  }
  for (const [code, values] of Object.entries(plans ?? {})) {
    for (const [key, value] of Object.entries(values)) changes[`plans.${code}.${key}`] = value;
  }

  const updated = await Settings.findByIdAndUpdate(settings._id, { $set: changes }, { new: true, runValidators: true });
  if (billing || plans) await applyPlanChanges(Object.keys(plans ?? {}));
  return updated;
}

// Packages badle: memory wali copy turant taaza, aur jis plan se koi feature hata uski companies mein us feature ki
// setting band (jaise plan se Leave hata to un companies ka leaveEnabled OFF), taaki hata hua feature chalta na rahe.
async function applyPlanChanges(codes) {
  await refreshPlans({ force: true });
  for (const code of codes) await Company.updateMany({ plan: code }, { $set: planChange(code) });
}
