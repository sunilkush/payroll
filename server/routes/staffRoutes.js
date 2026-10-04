import { Router } from 'express';
import * as staffController from '../controllers/staffController.js';
import { validate } from '../middlewares/validate.js';
import { idParamSchema } from '../validators/common.js';
import {
  createStaffSchema,
  listStaffSchema,
  staffStatusSchema,
  updateStaffSchema,
} from '../validators/staffValidator.js';

const router = Router();
const staffId = validate(idParamSchema, 'params');

router.get('/', validate(listStaffSchema, 'query'), staffController.list);
router.post('/', validate(createStaffSchema), staffController.create);
router.get('/:id', staffId, staffController.getOne);
router.put('/:id', staffId, validate(updateStaffSchema), staffController.update);
router.patch('/:id/status', staffId, validate(staffStatusSchema), staffController.setStatus);

export default router;
