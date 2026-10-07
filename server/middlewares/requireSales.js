import { ApiError } from '../utils/ApiError.js';
import { ROLES } from '../utils/constants.js';

// auth ke baad lagta hai. Sales meetings module company ki Settings mein ON hona chahiye,
// aur staff mein se sirf wahi andar aata hai jise admin ne sales manager banaya hai.
export const requireSales = (req, res, next) => {
  if (!req.company?.salesEnabled) {
    return next(new ApiError(403, 'Sales meetings are turned off for your company. Please contact your admin.'));
  }
  if (req.user.role === ROLES.STAFF && !req.user.isSalesManager) {
    return next(new ApiError(403, 'Sales meetings are not enabled for your account.'));
  }
  next();
};
