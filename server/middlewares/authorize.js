import { ApiError } from '../utils/ApiError.js';

// Usage: router.post('/staff', auth, tenant, authorize('ADMIN'), ...)
export const authorize =
  (...allowedRoles) =>
  (req, res, next) => {
    if (!req.user) return next(new ApiError(401, 'Login zaroori hai.'));
    if (!allowedRoles.includes(req.user.role)) {
      return next(new ApiError(403, 'Aapko is action ki permission nahi hai.'));
    }
    next();
  };
