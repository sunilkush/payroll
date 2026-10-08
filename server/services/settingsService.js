import { Company } from '../models/Company.js';
import { ApiError } from '../utils/ApiError.js';
import { getTenantId } from '../utils/tenantContext.js';
import { creditCompany } from './leaveService.js';
import { refreshQrExpiry } from './meetingService.js';

// Admin ki apni company ki settings. Company ka _id hi tenant id hai.

export async function getSettings() {
  const company = await Company.findById(getTenantId());
  if (!company) throw new ApiError(404, 'Company not found.');
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

  // Working time: start aur end mein se ek hi badla ho to bhi doosre (purane) ke saath jaancho.
  const workStart = settings?.workStartTime ?? before.settings.workStartTime;
  const workEnd = settings?.workEndTime ?? before.settings.workEndTime;
  if (workEnd <= workStart) {
    const message = 'Work end time must be after work start time.';
    throw new ApiError(400, message, [{ field: 'settings.workEndTime', message }]);
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
  // Sales meetings ka check-in grace badla: khuli meetings ke QR ki "valid until" bhi badlo.
  if (before.settings.meetingCheckInGraceMin !== company.settings.meetingCheckInGraceMin) {
    await refreshQrExpiry(company.settings.meetingCheckInGraceMin);
  }
  return company;
}
