import mongoose from 'mongoose';

// Mobile app ka ek login = ek document: us phone ka refresh token (sirf hash) aur push token.
// Web login yahan nahi aata (wo deviceId nahi bhejta). Logout par document hat jata hai,
// isliye us phone par notifications bhi band ho jati hain.
// Tenant plugin nahi hai: auth routes tenant context ke bahar chalte hain, sab kuch userId se milta hai.
const deviceSessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    deviceId: { type: String, required: true, trim: true }, // app ka banaya hua random id
    platform: { type: String, enum: ['android', 'ios'] },
    // Refresh token ka sha256. Har refresh par badal jata hai (rotation), purana token phir nahi chalta.
    refreshHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    pushToken: { type: String, trim: true }, // Expo push token
    lastUsedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Ek user ka ek phone par ek hi session.
deviceSessionSchema.index({ userId: 1, deviceId: 1 }, { unique: true });
// Expire hue sessions MongoDB khud hata deta hai.
deviceSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const DeviceSession = mongoose.model('DeviceSession', deviceSessionSchema);
