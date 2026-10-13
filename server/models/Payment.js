import mongoose from 'mongoose';
import { COMPANY_PLANS } from '../utils/constants.js';
import { tenantPlugin } from './plugins/tenantPlugin.js';

export const PAYMENT_STATUS = Object.freeze({ CREATED: 'CREATED', PAID: 'PAID', FAILED: 'FAILED' });

// Razorpay ka ek order = ek document. Admin "Pay" dabata hai to CREATED banta hai; payment pakki hone par PAID
// (tabhi plan chalu hota hai aur invoice banta hai).
const paymentSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    plan: { type: String, enum: Object.values(COMPANY_PLANS), required: true },
    // Order banate waqt ka hisaab (subscriptionService.quoteFor); total hi Razorpay se liya jata hai.
    amount: {
      monthlyPrice: Number,
      months: Number,
      subtotal: Number,
      gstPercent: Number,
      gst: Number,
      total: { type: Number, required: true },
    },
    // Invoice ke liye kharidne wale ki jaankari (order ke waqt admin ne bhari)
    buyer: { gstin: { type: String, trim: true, uppercase: true }, state: { type: String, trim: true } },
    orderId: { type: String, required: true, unique: true }, // Razorpay order id
    paymentId: { type: String }, // Razorpay payment id (payment ke baad)
    status: { type: String, enum: Object.values(PAYMENT_STATUS), default: PAYMENT_STATUS.CREATED },
    failureReason: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    paidAt: { type: Date },
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
  },
  { timestamps: true }
);

paymentSchema.index({ companyId: 1, createdAt: -1 });

paymentSchema.plugin(tenantPlugin);

export const Payment = mongoose.model('Payment', paymentSchema);
