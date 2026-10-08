import { Router } from 'express';
import * as companyController from '../controllers/companyController.js';
import { validate } from '../middlewares/validate.js';
import {
  adminIdParamSchema,
  companyIdParamSchema,
  planRequestDecisionSchema,
  companyStatusSchema,
  createAdminSchema,
  createCompanySchema,
  listCompaniesSchema,
  updateAdminSchema,
  updateCompanySchema,
} from '../validators/companyValidator.js';

const router = Router();
const companyId = validate(companyIdParamSchema, 'params');

router.get('/', validate(listCompaniesSchema, 'query'), companyController.list);
router.post('/', validate(createCompanySchema), companyController.create);
router.get('/:id', companyId, companyController.getOne);
router.put('/:id', companyId, validate(updateCompanySchema), companyController.update);
router.patch('/:id/status', companyId, validate(companyStatusSchema), companyController.setStatus);
// Company ke admin ki upgrade request ka faisla
router.patch('/:id/plan-request', companyId, validate(planRequestDecisionSchema), companyController.decidePlanRequest);

router.post('/:id/admins', companyId, validate(createAdminSchema), companyController.createAdmin);
router.patch(
  '/:id/admins/:adminId',
  validate(adminIdParamSchema, 'params'),
  validate(updateAdminSchema),
  companyController.updateAdmin
);

export default router;
