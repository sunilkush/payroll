import { User } from '../models/User.js';
import { Company } from '../models/Company.js';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';
import { COMPANY_PLANS, PLAN_FEATURES, PLAN_STAFF_LIMIT, ROLES } from '../utils/constants.js';
import { sendVerificationCode, verificationRequired } from './accountService.js';
import { signAccessToken, verifyAccessToken } from './tokenService.js';

// User aur uski company active honi chahiye. Company ki chhoti summary lautata hai
// (Super Admin ke liye null), jisse frontend ko pata chalta hai kaun se modules ON hain.
async function assertCanAccess(user) {
  if (!user.isActive) throw new ApiError(403, 'Your account is deactivated. Please contact your admin.');
  if (user.role === ROLES.SUPER_ADMIN) return null;

  const company = await Company.findById(user.companyId).select(
    'name isActive plan settings.leaveEnabled settings.salesEnabled settings.requireVisitPhoto'
  );
  if (!company) throw new ApiError(403, 'Company not found.');
  if (!company.isActive) throw new ApiError(403, 'Your company is blocked. Please contact support.');

  return {
    _id: company._id,
    name: company.name,
    plan: company.plan,
    staffLimit: PLAN_STAFF_LIMIT[company.plan], // null = koi hadd nahi
    // Plan mein jo features hain (menu aur settings inhi se dikhte / band hote hain)
    features: PLAN_FEATURES[company.plan],
    payrollEnabled: PLAN_FEATURES[company.plan].includes('payroll'),
    correctionsEnabled: PLAN_FEATURES[company.plan].includes('corrections'),
    leaveEnabled: company.settings.leaveEnabled,
    salesEnabled: company.settings.salesEnabled,
    requireVisitPhoto: company.settings.requireVisitPhoto,
  };
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

const fieldError = (status, field, message) => new ApiError(status, message, [{ field, message }]);

// Website se free account: nayi company (FREE plan) + uska admin, aur seedha login.
// Email poore system mein ek hi baar; company ka naam bhi (case ka fark nahi padta).
export async function register({ companyName, name, email, phone, password }) {
  if (!env.allowRegistration) {
    throw new ApiError(403, 'New registrations are closed right now. Please contact us to get an account.');
  }
  if (await User.exists({ email })) {
    throw fieldError(409, 'email', 'An account with this email already exists. Try logging in.');
  }

  let company;
  try {
    company = await Company.create({ name: companyName, plan: COMPANY_PLANS.FREE, selfRegistered: true });
  } catch (err) {
    if (err.code === 11000) throw fieldError(409, 'companyName', 'A company with this name is already registered.');
    throw err;
  }

  // Email ja sakti ho to pehle verify karwate hain; warna (SMTP na ho) account seedha chalu.
  const mustVerify = verificationRequired();
  let user;
  try {
    user = await User.create({ name, email, phone, password, role: ROLES.ADMIN, companyId: company._id, emailVerified: !mustVerify });
  } catch (err) {
    // Standalone MongoDB mein transaction nahi hota, isliye admin na bane to company hata do.
    await Company.deleteOne({ _id: company._id });
    if (err.code === 11000) throw fieldError(409, 'email', 'An account with this email already exists. Try logging in.');
    throw err;
  }

  if (mustVerify) await sendVerificationCode(user);
  return { user, company: await assertCanAccess(user), token: signAccessToken(user) };
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
  // Password reset ke baad purane tokens band (iat second mein hota hai, isliye 1 second ki chhoot).
  if (user.passwordChangedAt && payload.iat * 1000 < user.passwordChangedAt.getTime() - 1000) {
    throw new ApiError(401, 'Your password was changed. Please log in again.');
  }
  const company = await assertCanAccess(user);

  return { user, company };
}
