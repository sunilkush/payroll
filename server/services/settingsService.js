import { Company } from '../models/Company.js';
import { ApiError } from '../utils/ApiError.js';
import { getTenantId } from '../utils/tenantContext.js';
import { creditCompany } from './leaveService.js';

// Admin ki apni company ki settings. Company ka _id hi tenant id hai.

export async function getSettings() {
  const company = await Company.findById(getTenantId());
  if (!company) throw new ApiError(404, 'Company nahi mili.');
  return company;
}

export async function updateSettings({ locations, holidays, settings }) {
  const before = await getSettings();

  const changes = {};
  if (locations) changes.locations = locations;
  if (holidays) changes.holidays = [...holidays].sort((a, b) => a.date.localeCompare(b.date));
  // Sirf bheje gaye keys badalte hain, baaki settings waisi hi rehti hain.
  for (const [key, value] of Object.entries(settings ?? {})) {
    changes[`settings.${key}`] = value;
  }

  const company = await Company.findByIdAndUpdate(
    before._id,
    { $set: changes },
    { new: true, runValidators: true }
  );

  // Leave management abhi ON hua: staff ko is mahine ka credit turant de do, warna
  // agli 1 tarikh tak balance 0 rehta. (Mahine mein ek hi baar lagta hai.)
  if (!before.settings.leaveEnabled && company.settings.leaveEnabled) {
    await creditCompany(company);
  }
  return company;
}
