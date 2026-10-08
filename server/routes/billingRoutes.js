import { Router } from 'express';
import * as billingController from '../controllers/billingController.js';
import { validate } from '../middlewares/validate.js';
import { upgradeRequestSchema } from '../validators/billingValidator.js';

const router = Router();

router.get('/', billingController.get);
router.post('/upgrade-request', validate(upgradeRequestSchema), billingController.requestUpgrade);
router.delete('/upgrade-request', billingController.cancelRequest);

export default router;
