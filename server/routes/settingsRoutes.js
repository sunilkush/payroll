import { Router } from 'express';
import * as settingsController from '../controllers/settingsController.js';
import { validate } from '../middlewares/validate.js';
import { updateSettingsSchema } from '../validators/settingsValidator.js';

const router = Router();

router.get('/', settingsController.get);
router.put('/', validate(updateSettingsSchema), settingsController.update);

export default router;
