import { User } from '../models/User.js';
import { Company } from '../models/Company.js';
import { ApiError } from '../utils/ApiError.js';
import { ROLES } from '../utils/constants.js';
import { signAccessToken, verifyAccessToken } from './tokenService.js';

// User aur uski company active honi chahiye. Company ki chhoti summary lautata hai
// (Super Admin ke liye null), jisse frontend ko pata chalta hai kaun se modules ON hain.
async function assertCanAccess(user) {
  if (!user.isActive) throw new ApiError(403, 'Your account is deactivated. Please contact your admin.');
  if (user.role === ROLES.SUPER_ADMIN) return null;

  const company = await Company.findById(user.companyId).select('name isActive settings.leaveEnabled');
  if (!company) throw new ApiError(403, 'Company not found.');
  if (!company.isActive) throw new ApiError(403, 'Your company is blocked. Please contact support.');

  return { _id: company._id, name: company.name, leaveEnabled: company.settings.leaveEnabled };
}

export async function login({ email, password }) {
  const user = await User.findOne({ email }).select('+password');
  // User na mile ya password galat ho, dono mein same message (email enumeration se bachne ke liye).
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Incorrect email or password.');
  }
  const company = await assertCanAccess(user);

  return { user, company, token: signAccessToken(user) };
}

// Token se current user nikalta hai. Har request par DB se check hota hai taaki
// block/deactivate turant lagu ho, token expire hone ka wait na karna pade.
export async function authenticate(token) {
  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    throw new ApiError(401, 'Your session has expired. Please log in again.');
  }

  const user = await User.findById(payload.sub);
  if (!user) throw new ApiError(401, 'Your session is invalid. Please log in again.');
  const company = await assertCanAccess(user);

  return { user, company };
}
