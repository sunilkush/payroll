import mongoose from 'mongoose';
import { ATTENDANCE_STATUS } from '../utils/constants.js';
import { tenantPlugin } from './plugins/tenantPlugin.js';

const punchSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['IN', 'OUT'] },
    time: { type: Date, required: true },
    // Location sirf asli (GPS) punch par hoti hai; correction request se bane punch par nahi.
    lat: { type: Number },
    lng: { type: Number },
    accuracy: { type: Number }, // GPS accuracy, meters
    distance: { type: Number }, // office se doori, meters
    locationName: { type: String },
    // Fake GPS poori tarah nahi rok sakte, isliye IP/device ka log rakhte hain.
    ip: { type: String },
    userAgent: { type: String },
    // Mobile app ka offline punch: time phone ka hai (network na hone par), server tak syncedAt par pahuncha.
    offline: { type: Boolean },
    syncedAt: { type: Date },
    // Time admin ne punch correction request manzoor karke badla hai.
    corrected: { type: Boolean },
  },
  { _id: true }
);

const attendanceSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ }, // app timezone ki date
    // Multiple punch events auditable array (har in aur out alag se permanent record hota hai)
    punches: { type: [punchSchema], default: [] },
    // First in (hamesha din ka pehla valid punch in; backward compatibility)
    punchIn: { type: punchSchema, required: true },
    // Last out (din ka aakhri valid punch out; agar abhi kaam par hai to null)
    punchOut: { type: punchSchema },
    // Total net working minutes (breaks exclude karke sum)
    netWorkMinutes: { type: Number, default: 0 },
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
