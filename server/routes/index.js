import { Router } from 'express';
import { env } from '../config/env.js';
import { razorpayWebhook } from '../controllers/billingController.js';
import { auth } from '../middlewares/auth.js';
import { authorize } from '../middlewares/authorize.js';
import { requireFeature } from '../middlewares/requireFeature.js';
import { requireSubscription } from '../middlewares/requireSubscription.js';
import { requireSales } from '../middlewares/requireSales.js';
import { tenant } from '../middlewares/tenant.js';
import { getPublicPlans } from '../services/planService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ROLES } from '../utils/constants.js';
import attendanceRoutes from './attendanceRoutes.js';
import authRoutes from './authRoutes.js';
import billingRoutes from './billingRoutes.js';
import clientRoutes from './clientRoutes.js';
import companyRoutes from './companyRoutes.js';
import dashboardRoutes from './dashboardRoutes.js';
import globalSettingsRoutes from './globalSettingsRoutes.js';
import holidayRoutes from './holidayRoutes.js';
import leaveRoutes from './leaveRoutes.js';
import meetingRoutes from './meetingRoutes.js';
import payrollRoutes from './payrollRoutes.js';
import punchCorrectionRoutes from './punchCorrectionRoutes.js';
import settingsRoutes from './settingsRoutes.js';
import staffRoutes from './staffRoutes.js';

const router = Router();

router.get('/health', (req, res) => res.json({ success: true, message: 'OK' }));
// Mobile app khulte hi poochta hai (bina login): mera version chalega ya update zaroori hai.
// Packages aur daam (bina login): landing page aur Plan & Billing isi se dikhate hain. Super Admin badalta hai.
router.get('/plans', asyncHandler(async (req, res) => res.json({ success: true, data: await getPublicPlans() })));
router.get('/app/config', (req, res) => res.json({ success: true, data: env.mobileApp }));
router.use('/auth', authRoutes);
// Razorpay payment pakki hone par yahan batata hai (bina login; signature se jaanch hoti hai).
router.post('/webhooks/razorpay', razorpayWebhook);

// Sirf Super Admin, saari companies par kaam karta hai, isliye yahan tenant middleware nahi hai.
router.use('/companies', auth, authorize(ROLES.SUPER_ADMIN), companyRoutes);
router.use('/global-settings', auth, authorize(ROLES.SUPER_ADMIN), globalSettingsRoutes);

// Company ke andar wale modules: auth -> tenant -> authorize -> routes.
router.use('/staff', auth, tenant, requireSubscription, authorize(ROLES.ADMIN), staffRoutes);
router.use('/settings', auth, tenant, requireSubscription, authorize(ROLES.ADMIN), settingsRoutes);
// In modules mein staff aur admin dono ke routes hain, role check har route par hai.
router.use('/attendance', auth, tenant, requireSubscription, attendanceRoutes);
router.use('/leaves', auth, tenant, requireSubscription, leaveRoutes);
router.use('/punch-corrections', auth, tenant, requireSubscription, requireFeature('corrections'), punchCorrectionRoutes);
router.use('/payroll', auth, tenant, requireSubscription, requireFeature('payroll'), payrollRoutes);
// Plan, usage aur upgrade request (admin). Subscription khatam hone par bhi khula rehta hai: yahin se plan lete hain.
router.use('/billing', auth, tenant, authorize(ROLES.ADMIN), billingRoutes);
// Sales meetings: company mein module ON ho tabhi (requireSales). Clients sirf admin sambhalta hai.
router.use('/clients', auth, tenant, requireSubscription, authorize(ROLES.ADMIN), requireSales, clientRoutes);
router.use('/meetings', auth, tenant, requireSubscription, requireSales, meetingRoutes);
// Saal ki holidays (staff ko apni branch wali, admin ko saari). Badalna /settings se.
router.use('/holidays', auth, tenant, requireSubscription, authorize(ROLES.ADMIN, ROLES.STAFF), holidayRoutes);
// Teeno roles ke dashboards (sirf padhne wala data). Super Admin ke liye tenant scope khali rehta hai.
router.use('/dashboard', auth, tenant, requireSubscription, dashboardRoutes);

export default router;
