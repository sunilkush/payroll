import mongoose from 'mongoose';
import { tenantPlugin } from './plugins/tenantPlugin.js';

// available: apply kar sakte hain | pending: apply ho chuki, approval baaki (blocked) | used: approved
const bucket = {
  available: { type: Number, default: 0 },
  pending: { type: Number, default: 0 },
  used: { type: Number, default: 0 },
};

const leaveBalanceSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    year: { type: Number, required: true },
    CL: bucket,
    EL: bucket,
    // 'YYYY-MM': monthly credit ek mahine mein ek hi baar lage, cron dobara chale to bhi.
    lastCreditedMonth: { type: String, default: null },
  },
  { timestamps: true }
);

leaveBalanceSchema.index({ userId: 1, year: 1 }, { unique: true });

leaveBalanceSchema.plugin(tenantPlugin);

export const LeaveBalance = mongoose.model('LeaveBalance', leaveBalanceSchema);
