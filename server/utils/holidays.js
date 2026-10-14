// Company ki paid holidays. Har holiday ya to saari branches ki hai (branchIds khali) ya kuch branches ki.
// Staff ki branch (user.branchId) se tay hota hai ki uske liye kaun si holiday lagti hai:
//   - saari branches wali: sabko
//   - branch wali: sirf us branch ke staff ko. Jis staff ki koi branch nahi, use sirf saari branches wali.

export const HOLIDAY_TYPES = Object.freeze(['NATIONAL', 'FESTIVAL', 'COMPANY']);

export const isAllBranches = (holiday) => !holiday.branchIds?.length;

export const appliesTo = (holiday, user) =>
  isAllBranches(holiday) || Boolean(user?.branchId && holiday.branchIds.some((id) => String(id) === String(user.branchId)));

// user na do (admin ki company-wide ginti) to sirf saari branches wali.
export const holidaysFor = (company, user) => (company.holidays ?? []).filter((holiday) => appliesTo(holiday, user));

export const holidayOn = (company, date, user) => holidaysFor(company, user).find((holiday) => holiday.date === date) ?? null;
