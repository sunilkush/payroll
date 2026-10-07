import mongoose from 'mongoose';
import { CORRECTION_STATUS } from '../utils/constants.js';
import { tenantPlugin } from './plugins/tenantPlugin.js';

// Staff punch karna bhool jaye to sahi time ke liye admin ko request bhejta hai.
// Approve hone par hi Attendance badalti hai.
const punchCorrectionSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ }, // app timezone ki date
    // Maanga hua sahi time. Jo punch theek hai wo khali rehta hai.
    punchIn: { type: Date },
    punchOut: { type: Date },
    // Request ke waqt attendance mein jo time tha (admin ko tulna ke liye).
    recorded: {
      punchIn: { type: Date },
      punchOut: { type: Date },
    },
    reason: { type: String, required: true, trim: true },
    status: { type: String, enum: Object.values(CORRECTION_STATUS), default: CORRECTION_STATUS.PENDING },
    actionBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    actionAt: { type: Date },
    actionNote: { type: String, trim: true },
  },
  { timestamps: true }
);

// Ek din ke liye ek waqt mein ek hi pending request.
punchCorrectionSchema.index(
  { userId: 1, date: 1 },
  { unique: true, partialFilterExpression: { status: CORRECTION_STATUS.PENDING } }
);
punchCorrectionSchema.index({ companyId: 1, status: 1, createdAt: -1 });

punchCorrectionSchema.plugin(tenantPlugin);

export const PunchCorrection = mongoose.model('PunchCorrection', punchCorrectionSchema);
