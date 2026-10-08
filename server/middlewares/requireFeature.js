import { ApiError } from '../utils/ApiError.js';
import { FEATURE_LABEL, FEATURE_MIN_PLAN, PLAN_FEATURES, PLAN_LABEL } from '../utils/constants.js';

// auth ke baad lagta hai. Company ke plan mein ye feature na ho to 403 (kaun sa plan chahiye, ye bata kar).
// Usage: router.use('/payroll', auth, tenant, requireFeature('payroll'), payrollRoutes)
export const requireFeature = (feature) => (req, res, next) => {
  // Super Admin kisi plan mein nahi bandha.
  if (!req.company || PLAN_FEATURES[req.company.plan]?.includes(feature)) return next();
  next(
    new ApiError(
      403,
      `${FEATURE_LABEL[feature]} is available on the ${PLAN_LABEL[FEATURE_MIN_PLAN[feature]]} plan and above. Upgrade your plan to use it.`,
      [{ field: 'plan', message: `Needs the ${PLAN_LABEL[FEATURE_MIN_PLAN[feature]]} plan` }]
    )
  );
};
