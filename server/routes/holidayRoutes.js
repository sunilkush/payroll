import { Router } from 'express';
import Joi from 'joi';
import { validate } from '../middlewares/validate.js';
import { getHolidays } from '../services/holidayService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { todayStr } from '../utils/dateUtil.js';

const router = Router();

// year na do to chalu saal
const holidayQuerySchema = Joi.object({
  year: Joi.number().integer().min(2000).max(2100).default(() => Number(todayStr().slice(0, 4))),
});

router.get(
  '/',
  validate(holidayQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const data = await getHolidays(req.user, req.query.year);
    res.json({ success: true, data });
  })
);

export default router;
