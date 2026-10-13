import { ApiError } from '../utils/ApiError.js';
import { featureLockedMessage, featureMinPlanLabel, planFeatures } from '../services/planService.js';

// auth ke baad lagta hai. Company ke plan mein ye feature na ho to 403 (kaun sa plan chahiye, ye bata kar).
// Usage: router.use('/payroll', auth, tenant, requireFeature('payroll'), payrollRoutes)
export const requireFeature = (feature) => (req, res, next) => {
  // Super Admin kisi plan mein nahi bandha.
  if (!req.company || planFeatures(req.company.plan).includes(feature)) return next();
  const minPlan = featureMinPlanLabel(feature);
  next(new ApiError(403, featureLockedMessage(feature), [{ field: 'plan', message: minPlan ? `Needs the ${minPlan} plan` : 'Not in your plan' }]));
};
