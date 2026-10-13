import { ApiError } from '../utils/ApiError.js';

// auth ke baad lagta hai. Free trial / subscription khatam ho chuka ho to company ka koi module nahi khulta
// (402), sirf Plan & Billing: wahin se admin plan leta hai. Staff yahan tak pahunchta hi nahi (login par hi rok).
// Usage: router.use('/staff', auth, tenant, requireSubscription, ...)
export const requireSubscription = (req, res, next) => {
  // Super Admin (company null) par koi rok nahi.
  if (req.company?.subscription.status !== 'EXPIRED') return next();
  next(
    new ApiError(402, 'Your free trial or subscription has ended. Choose a plan on the Plan & Billing page to continue.', [
      { field: 'subscription', message: 'Subscription expired' },
    ])
  );
};
