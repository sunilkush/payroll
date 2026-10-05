import mongoose from 'mongoose';
import { ApiError } from '../utils/ApiError.js';
import { ROLES } from '../utils/constants.js';
import { runWithTenant } from '../utils/tenantContext.js';

// auth ke baad lagta hai. ADMIN/STAFF hamesha apni company tak limited rehte hain.
// Super Admin by default sab dekhta hai; x-company-id header bhej kar kisi ek
// company ke scope mein kaam kar sakta hai.
export const tenant = (req, res, next) => {
  if (!req.user) return next(new ApiError(401, 'Please log in to continue.'));

  let companyId = null;
  if (req.user.role === ROLES.SUPER_ADMIN) {
    const requested = req.headers['x-company-id'];
    if (requested) {
      if (!mongoose.isValidObjectId(requested)) {
        return next(new ApiError(400, 'x-company-id is not valid.'));
      }
      companyId = new mongoose.Types.ObjectId(requested);
    }
  } else {
    companyId = req.user.companyId;
  }

  req.companyId = companyId;
  runWithTenant(companyId, next);
};
