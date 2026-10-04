import mongoose from 'mongoose';
import { ATTENDANCE_STATUS } from '../utils/constants.js';
import { tenantPlugin } from './plugins/tenantPlugin.js';

const punchSchema = new mongoose.Schema(
  {
    time: { type: Date, required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    accuracy: { type: Number }, // GPS accuracy, meters
    distance: { type: Number, required: true }, // office se doori, meters
    locationName: { type: String },
    // Fake GPS poori tarah nahi rok sakte, isliye IP/device ka log rakhte hain.
    ip: { type: String },
    userAgent: { type: String },
  },
  { _id: false }
);

const attendanceSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ }, // app timezone ki date
    punchIn: { type: punchSchema, required: true },
    punchOut: { type: punchSchema },
    status: { type: String, enum: Object.values(ATTENDANCE_STATUS), default: ATTENDANCE_STATUS.PRESENT },
    missedPunchOut: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Ek staff ka ek din mein ek hi record.
attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ companyId: 1, date: 1 });

attendanceSchema.plugin(tenantPlugin);

export const Attendance = mongoose.model('Attendance', attendanceSchema);
