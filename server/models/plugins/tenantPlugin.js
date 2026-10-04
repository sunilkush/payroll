import { getTenantId } from '../../utils/tenantContext.js';

const QUERY_HOOKS = [
  'countDocuments',
  'deleteMany',
  'deleteOne',
  'distinct',
  'find',
  'findOne',
  'findOneAndDelete',
  'findOneAndReplace',
  'findOneAndUpdate',
  'replaceOne',
  'updateMany',
  'updateOne',
];

// Jis schema mein companyId hai us par ye plugin lagao. Tenant context ke andar
// har query apne aap companyId se filter hoti hai aur naye documents par
// companyId stamp hota hai, controller mein manually likhne ki zaroorat nahi.
export function tenantPlugin(schema) {
  schema.pre(QUERY_HOOKS, function scopeQuery() {
    const companyId = getTenantId();
    if (companyId) this.where({ companyId });
  });

  schema.pre('aggregate', function scopeAggregate() {
    const companyId = getTenantId();
    if (companyId) this.pipeline().unshift({ $match: { companyId } });
  });

  schema.pre('validate', function stampCompany() {
    const companyId = getTenantId();
    if (companyId && this.isNew) this.companyId = companyId;
  });

  schema.pre('insertMany', function stampMany(next, docs) {
    const companyId = getTenantId();
    if (companyId) {
      for (const doc of [].concat(docs)) doc.companyId = companyId;
    }
    next();
  });
}
