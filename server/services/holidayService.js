import { Company } from '../models/Company.js';
import { ApiError } from '../utils/ApiError.js';
import { ROLES } from '../utils/constants.js';
import { holidaysFor } from '../utils/holidays.js';
import { getTenantId } from '../utils/tenantContext.js';

// Ek saal ki holidays padhne ke liye (staff aur admin dono). Badalna sirf admin settings (PUT /settings) se.
//   Staff: sirf jo uski branch par lagti hain.     Admin: saari, branch ke saath.
// Return: { year, holidays: [{ date, name, type, branchIds }], weekOffDays, branches: [{ _id, name }] }
export async function getHolidays(requester, year) {
  const company = await Company.findById(getTenantId());
  if (!company) throw new ApiError(404, 'Company not found.');

  const list = requester.role === ROLES.STAFF ? holidaysFor(company, requester) : company.holidays;
  return {
    year,
    holidays: list
      .filter((holiday) => holiday.date.startsWith(`${year}-`))
      .map(({ date, name, type, branchIds }) => ({ date, name, type, branchIds }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    weekOffDays: company.settings.weekOffDays,
    branches: company.locations.map(({ _id, name }) => ({ _id, name })),
  };
}
