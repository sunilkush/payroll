import { Router } from 'express';
import * as globalSettingsController from '../controllers/globalSettingsController.js';
import { validate } from '../middlewares/validate.js';
import { updateGlobalSettingsSchema } from '../validators/globalSettingsValidator.js';

const router = Router();

router.get('/', globalSettingsController.get);
router.put('/', validate(updateGlobalSettingsSchema), globalSettingsController.update);

export default router;
