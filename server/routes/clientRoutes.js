import { Router } from 'express';
import * as clientController from '../controllers/clientController.js';
import { validate } from '../middlewares/validate.js';
import {
  clientStatusSchema,
  createClientSchema,
  listClientsSchema,
  updateClientSchema,
} from '../validators/clientValidator.js';
import { idParamSchema } from '../validators/common.js';

const router = Router();
const clientId = validate(idParamSchema, 'params');

router.get('/', validate(listClientsSchema, 'query'), clientController.list);
router.post('/', validate(createClientSchema), clientController.create);
router.get('/:id', clientId, clientController.getOne);
router.put('/:id', clientId, validate(updateClientSchema), clientController.update);
router.patch('/:id/status', clientId, validate(clientStatusSchema), clientController.setStatus);

export default router;
