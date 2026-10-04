import Joi from 'joi';
import { currentMonth } from '../utils/dateUtil.js';

const month = Joi.string()
  .pattern(/^\d{4}-(0[1-9]|1[0-2])$/)
  .label('Month')
  .messages({ 'string.pattern.base': 'Month YYYY-MM format mein hona chahiye' });

// generate / finalize: month body mein zaroori hai
export const payrollMonthSchema = Joi.object({ month: month.required() });

// list / export: month na ho to chalu mahina
export const payrollQuerySchema = Joi.object({ month: month.default(() => currentMonth()) });

export const updatePayrollSchema = Joi.object({
  otherDeductions: Joi.number().min(0).precision(2).label('Other deductions'),
  remarks: Joi.string().trim().max(200).allow('').label('Remarks'),
}).min(1);
