import mongoose from 'mongoose';
import { tenantPlugin } from './plugins/tenantPlugin.js';

const party = { name: String, address: String, gstin: String, state: String };

// GST tax invoice: har pakki payment par ek. Sab kuch us waqt ki copy hai (naam, pata, rate),
// taaki baad mein company ya daam badle to purana invoice na badle.
const invoiceSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', required: true, unique: true },
    number: { type: String, required: true, unique: true }, // PR/2026-27/0001: financial year ke andar lagataar
    date: { type: Date, required: true },
    seller: party,
    buyer: party,
    description: { type: String, required: true },
    sac: { type: String },
    periodFrom: { type: Date },
    periodTo: { type: Date },
    taxable: { type: Number, required: true },
    gstPercent: { type: Number, required: true },
    // Ek hi state mein bikri: CGST + SGST (aadha-aadha). Doosre state mein: IGST.
    cgst: { type: Number, default: 0 },
    sgst: { type: Number, default: 0 },
    igst: { type: Number, default: 0 },
    total: { type: Number, required: true },
    razorpayPaymentId: { type: String },
  },
  { timestamps: true }
);

invoiceSchema.index({ companyId: 1, date: -1 });

invoiceSchema.plugin(tenantPlugin);

export const Invoice = mongoose.model('Invoice', invoiceSchema);

// Lagataar number dene ke liye ginti (key: 'invoice-2026-27'). $inc ek hi baar mein hota hai,
// isliye do payment ek saath aayein to bhi number dobara nahi banta.
const counterSchema = new mongoose.Schema({ key: { type: String, required: true, unique: true }, seq: { type: Number, default: 0 } });

export const Counter = mongoose.model('Counter', counterSchema);
