import mongoose from 'mongoose';
import { PAYROLL_STATUS } from '../utils/constants.js';
import { tenantPlugin } from './plugins/tenantPlugin.js';

const money = { type: Number, default: 0 };
const components = { basic: money, hra: money, special: money, other: money, gross: money };

const payrollSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    period: { type: String, required: true, match: /^\d{4}-\d{2}$/ }, // 'YYYY-MM'
    month: { type: Number, required: true },
    year: { type: Number, required: true },

    // Generate ke waqt ki copy: baad mein staff ka naam/bank/salary badle to purani slip na badle.
    staff: {
      name: String,
      employeeCode: String,
      joiningDate: Date,
      uan: String,
      esicNo: String,
      bankName: String,
      accountNo: String,
      ifsc: String,
    },
    salaryStructure: components, // poore mahine ka (monthly)
    attendance: {
      present: money,
      leave: money,
      weekOff: money,
      holiday: money,
      absent: money,
      notEmployed: money, // joining se pehle ke din
    },

    payableDays: { type: Number, required: true },
    lopDays: { type: Number, required: true },
    earnings: components, // payable days ke hisaab se
    pfWage: money,
    esiCovered: { type: Boolean, default: false },
    deductions: { pf: money, esi: money, other: money, total: money },
    // Sirf report ke liye, staff ki salary se nahi katta.
    employerContribution: { epf: money, eps: money, edli: money, pfAdmin: money, esi: money, total: money },
    netSalary: { type: Number, required: true },
    remarks: { type: String, trim: true, default: '' },

    status: { type: String, enum: Object.values(PAYROLL_STATUS), default: PAYROLL_STATUS.DRAFT },
    generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    finalizedAt: { type: Date },
  },
  { timestamps: true }
);

// Ek staff ki ek mahine mein ek hi payroll.
payrollSchema.index({ userId: 1, period: 1 }, { unique: true });
payrollSchema.index({ companyId: 1, period: 1 });

payrollSchema.plugin(tenantPlugin);

export const Payroll = mongoose.model('Payroll', payrollSchema);
