import { Settings } from '../models/Settings.js';

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

// data: { payrollDaysBasis?, pf?: {...}, esi?: {...} } - sirf bheje gaye keys badalte hain.
// Purani (pehle se bani) payroll par asar nahi padta, sirf naye generate par.
export async function updateGlobalSettings({ pf, esi, ...rest }) {
  const settings = await getGlobalSettings();
  const changes = { ...rest };
  for (const [key, value] of Object.entries(pf ?? {})) changes[`pf.${key}`] = value;
  for (const [key, value] of Object.entries(esi ?? {})) changes[`esi.${key}`] = value;

  return Settings.findByIdAndUpdate(settings._id, { $set: changes }, { new: true, runValidators: true });
}
