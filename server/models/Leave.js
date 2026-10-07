import mongoose from 'mongoose';
import { HALF_DAY_SESSIONS, LEAVE_STATUS, LEAVE_TYPES } from '../utils/constants.js';
import { tenantPlugin } from './plugins/tenantPlugin.js';

const dateStr = { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ };

const leaveSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: LEAVE_TYPES, required: true },
    fromDate: dateStr,
    toDate: dateStr,
    year: { type: Number, required: true }, // isi saal ke LeaveBalance se katti hai
    // Half day leave ek hi din ki hoti hai (fromDate = toDate) aur 0.5 din ginti hai.
    halfDay: { type: String, enum: HALF_DAY_SESSIONS },
    days: { type: Number, required: true, min: 0.5 }, // sirf working days (week off/holiday nahi ginte)
    reason: { type: String, required: true, trim: true },
    status: { type: String, enum: Object.values(LEAVE_STATUS), default: LEAVE_STATUS.PENDING },
    actionBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    actionAt: { type: Date },
    actionNote: { type: String, trim: true },
  },
  { timestamps: true }
);

leaveSchema.index({ userId: 1, fromDate: 1 });
leaveSchema.index({ companyId: 1, status: 1, createdAt: -1 });

leaveSchema.plugin(tenantPlugin);

export const Leave = mongoose.model('Leave', leaveSchema);
