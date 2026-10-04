import { ApiError } from '../utils/ApiError.js';

// Usage: router.post('/staff', auth, tenant, authorize('ADMIN'), ...)
export const authorize =
  (...allowedRoles) =>
  (req, res, next) => {
    if (!req.user) return next(new ApiError(401, 'Please log in to continue.'));
    if (!allowedRoles.includes(req.user.role)) {
      return next(new ApiError(403, 'You do not have permission to do this.'));
    }
    next();
  };
