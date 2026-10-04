import { AsyncLocalStorage } from 'node:async_hooks';

// Request ke dauran current company yahan rehti hai. tenant middleware isse set
// karta hai aur tenantPlugin har query mein padhta hai (Rule 3).
const storage = new AsyncLocalStorage();

export const runWithTenant = (companyId, callback) => storage.run({ companyId }, callback);

// null => koi tenant scope nahi (Super Admin, login, cron jobs, scripts).
export const getTenantId = () => storage.getStore()?.companyId ?? null;
