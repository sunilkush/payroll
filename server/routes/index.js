import { Router } from 'express';
import { auth } from '../middlewares/auth.js';
import { authorize } from '../middlewares/authorize.js';
import { tenant } from '../middlewares/tenant.js';
import { ROLES } from '../utils/constants.js';
import attendanceRoutes from './attendanceRoutes.js';
import authRoutes from './authRoutes.js';
import companyRoutes from './companyRoutes.js';
import globalSettingsRoutes from './globalSettingsRoutes.js';
import leaveRoutes from './leaveRoutes.js';
import payrollRoutes from './payrollRoutes.js';
import settingsRoutes from './settingsRoutes.js';
import staffRoutes from './staffRoutes.js';

const router = Router();

router.get('/health', (req, res) => res.json({ success: true, message: 'OK' }));
router.use('/auth', authRoutes);

// Sirf Super Admin, saari companies par kaam karta hai, isliye yahan tenant middleware nahi hai.
router.use('/companies', auth, authorize(ROLES.SUPER_ADMIN), companyRoutes);
router.use('/global-settings', auth, authorize(ROLES.SUPER_ADMIN), globalSettingsRoutes);

// Company ke andar wale modules: auth -> tenant -> authorize -> routes.
router.use('/staff', auth, tenant, authorize(ROLES.ADMIN), staffRoutes);
router.use('/settings', auth, tenant, authorize(ROLES.ADMIN), settingsRoutes);
// In modules mein staff aur admin dono ke routes hain, role check har route par hai.
router.use('/attendance', auth, tenant, attendanceRoutes);
router.use('/leaves', auth, tenant, leaveRoutes);
router.use('/payroll', auth, tenant, payrollRoutes);

export default router;
