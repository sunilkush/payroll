import { Router } from 'express';
import Joi from 'joi';
import * as dashboardController from '../controllers/dashboardController.js';
import { validate } from '../middlewares/validate.js';

const router = Router();

// days: admin ke attendance chart mein kitne din (7 / 14 / 30)
const dashboardQuerySchema = Joi.object({ days: Joi.number().valid(7, 14, 30).default(14) });

router.get('/', validate(dashboardQuerySchema, 'query'), dashboardController.get);
router.get('/notifications', dashboardController.notifications);

export default router;
