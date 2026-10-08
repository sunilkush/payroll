import mongoose from 'mongoose';
import {
  DEFAULT_MEETING_RADIUS,
  FOLLOW_UP_STATUS,
  LOCATION_STATUS,
  MEETING_EVENTS,
  MEETING_OUTCOMES,
  MEETING_STATUS,
} from '../utils/constants.js';
import { tenantPlugin } from './plugins/tenantPlugin.js';

const { ObjectId } = mongoose.Schema.Types;

// Check-in / check-out ka ek record. Time server ka hota hai aur doori server nikalta hai.
const visitPunchSchema = new mongoose.Schema(
  {
    at: { type: Date, required: true },
    // Check-in par hamesha hoti hai. Check-out par GPS na mile to khali (locationStatus: LOCATION_UNAVAILABLE).
    lat: { type: Number },
    lng: { type: Number },
    accuracy: { type: Number }, // GPS accuracy, meters
    distance: { type: Number }, // meeting location se doori, meters
    locationStatus: { type: String, enum: Object.values(LOCATION_STATUS), required: true },
    // Fake GPS poori tarah nahi rok sakte, isliye IP/device ka log rakhte hain (attendance punch jaisa).
    ip: { type: String },
    userAgent: { type: String },
  },
  { _id: false }
);

const fileSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, // user ko dikhne wala naam
    path: { type: String, required: true }, // storage ke andar ka raasta, bahar kabhi nahi jata
    mimeType: { type: String, required: true },
    size: { type: Number, required: true }, // bytes
    uploadedAt: { type: Date, default: Date.now },
    // Visit photo ke liye: kahan li gayi, aur app ke camera se li ya file chuni (phone ka bataya hua)
    lat: { type: Number },
    lng: { type: Number },
    source: { type: String, enum: ['camera', 'upload'] },
  },
  { _id: true }
);

// Audit history: kisne kab kya kiya. Sirf judta hai, badalta / mit-ta nahi.
const eventSchema = new mongoose.Schema(
  {
    type: { type: String, enum: Object.values(MEETING_EVENTS), required: true },
    at: { type: Date, default: Date.now },
    by: { type: ObjectId, ref: 'User' }, // cron ke events mein khali
    detail: { type: String, trim: true }, // jaise reject hone ki wajah
  },
  { _id: false }
);

const meetingSchema = new mongoose.Schema(
  {
    companyId: { type: ObjectId, ref: 'Company', required: true, index: true },
    clientId: { type: ObjectId, ref: 'Client', required: true },
    salesManagerId: { type: ObjectId, ref: 'User', required: true },
    // Is meeting mein client ki taraf se kaun milega (client ke default se alag ho sakta hai)
    contactPerson: { type: String, trim: true, default: '' },
    contactPhone: { type: String, trim: true, default: '' },

    title: { type: String, required: true, trim: true },
    purpose: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, default: '' },

    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ }, // app timezone ki date
    startAt: { type: Date, required: true },
    endAt: {
      type: Date,
      required: true,
      validate: {
        validator(value) {
          return value > this.startAt;
        },
        message: 'End time must be after start time.',
      },
    },

    location: {
      name: { type: String, trim: true, default: '' },
      address: { type: String, trim: true, default: '' },
      lat: { type: Number, required: true, min: -90, max: 90 },
      lng: { type: Number, required: true, min: -180, max: 180 },
      radius: { type: Number, default: DEFAULT_MEETING_RADIUS, min: 10, max: 5000 }, // meters
    },

    status: { type: String, enum: Object.values(MEETING_STATUS), default: MEETING_STATUS.SCHEDULED },

    // QR mein sirf ek random token hota hai; yahan uska hash rehta hai, token khud kabhi save nahi hota.
    // version badhane (regenerate) se purana QR bekaar ho jata hai.
    qr: {
      tokenHash: { type: String },
      version: { type: Number, default: 1 },
      expiresAt: { type: Date },
      sentAt: { type: Date },
    },

    // Visit: ek meeting ki ek hi visit hoti hai, isliye alag collection nahi.
    checkIn: { type: visitPunchSchema },
    checkOut: { type: visitPunchSchema },
    durationMinutes: { type: Number, min: 0 },

    result: {
      outcome: { type: String, enum: MEETING_OUTCOMES },
      clientInterested: { type: Boolean },
      requirement: { type: String, trim: true },
      estimatedDealValue: { type: Number, min: 0 },
      remarks: { type: String, trim: true },
      clientFeedback: { type: String, trim: true },
    },

    followUp: {
      at: { type: Date },
      notes: { type: String, trim: true },
      status: { type: String, enum: Object.values(FOLLOW_UP_STATUS) },
    },

    visitPhoto: { type: fileSchema },
    attachments: { type: [fileSchema], default: [] },

    cancelReason: { type: String, trim: true },
    createdBy: { type: ObjectId, ref: 'User', required: true },
    events: { type: [eventSchema], default: [] },
  },
  {
    timestamps: true,
    toJSON: {
      // API mein QR ka hash aur files ka storage path kabhi nahi jata.
      transform(doc, ret) {
        if (ret.qr) delete ret.qr.tokenHash;
        if (ret.visitPhoto) delete ret.visitPhoto.path;
        for (const file of ret.attachments ?? []) delete file.path;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Lists: admin (din / status), sales manager (apni meetings), client ki history.
meetingSchema.index({ companyId: 1, date: -1, status: 1 });
meetingSchema.index({ salesManagerId: 1, date: -1 });
meetingSchema.index({ clientId: 1, date: -1 });
// QR scan par isi se meeting milti hai.
meetingSchema.index(
  { 'qr.tokenHash': 1 },
  { unique: true, partialFilterExpression: { 'qr.tokenHash': { $type: 'string' } } }
);
// Ek sales manager ek waqt mein ek hi jagah ho sakta hai: ek saath do khuli visit nahi.
meetingSchema.index(
  { salesManagerId: 1 },
  { unique: true, partialFilterExpression: { status: MEETING_STATUS.CHECKED_IN }, name: 'one_open_visit_per_sales_manager' }
);
// Pending follow-ups ki list aur reminder.
meetingSchema.index(
  { companyId: 1, 'followUp.at': 1 },
  { partialFilterExpression: { 'followUp.status': FOLLOW_UP_STATUS.PENDING } }
);

meetingSchema.plugin(tenantPlugin);

export const Meeting = mongoose.model('Meeting', meetingSchema);
