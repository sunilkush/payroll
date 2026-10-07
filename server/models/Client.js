import mongoose from 'mongoose';
import { tenantPlugin } from './plugins/tenantPlugin.js';

// Company ke clients (jinse sales meeting hoti hai). Meeting banate waqt yahin se chunte hain.
const clientSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    name: { type: String, required: true, trim: true },
    contactPerson: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, lowercase: true, default: '' },
    address: { type: String, trim: true, default: '' },
    // Client ka aam pata; meeting banate waqt location isi se bhar jati hai (meeting par badal sakte hain).
    lat: { type: Number, min: -90, max: 90 },
    lng: { type: Number, min: -180, max: 180 },
    notes: { type: String, trim: true, default: '' },
    // Client delete nahi hota (purani meetings usse judi hain), sirf band hota hai.
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Ek company mein client ka naam unique, case ka fark nahi padta ("ABC Pvt Ltd" aur "abc pvt ltd" same).
clientSchema.index({ companyId: 1, name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

clientSchema.plugin(tenantPlugin);

export const Client = mongoose.model('Client', clientSchema);
