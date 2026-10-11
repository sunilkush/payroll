import mongoose from 'mongoose';
import { tenantPlugin } from './plugins/tenantPlugin.js';

const punchAuditSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['IN', 'OUT'], required: true },
    time: { type: Date, required: true, default: Date.now },
    date: { type: String, required: true },
    lat: { type: Number },
    lng: { type: Number },
    accuracy: { type: Number },
    distance: { type: Number },
    locationName: { type: String },
    ip: { type: String },
    userAgent: { type: String },
    status: { type: String, enum: ['SUCCESS', 'REJECTED'], required: true },
    rejectionReason: { type: String },
  },
  { timestamps: true }
);

punchAuditSchema.index({ companyId: 1, date: 1 });
punchAuditSchema.index({ userId: 1, date: 1 });
punchAuditSchema.plugin(tenantPlugin);

export const PunchAudit = mongoose.model('PunchAudit', punchAuditSchema);
