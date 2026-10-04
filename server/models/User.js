import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { ROLES, ROLE_VALUES } from '../utils/constants.js';
import { tenantPlugin } from './plugins/tenantPlugin.js';

const userSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      index: true,
      required() {
        return this.role !== ROLES.SUPER_ADMIN;
      },
    },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    password: { type: String, required: true, minlength: 8, select: false },
    role: { type: String, enum: ROLE_VALUES, default: ROLES.STAFF },
    employeeCode: { type: String, trim: true },
    joiningDate: { type: Date },
    salaryStructure: {
      basic: { type: Number, default: 0, min: 0 },
      hra: { type: Number, default: 0, min: 0 },
      special: { type: Number, default: 0, min: 0 },
      other: { type: Number, default: 0, min: 0 },
    },
    pfApplicable: { type: Boolean, default: false },
    esiApplicable: { type: Boolean, default: false },
    uan: { type: String, trim: true },
    esicNo: { type: String, trim: true },
    bankDetails: {
      accountNo: { type: String, trim: true },
      ifsc: { type: String, trim: true, uppercase: true },
      bankName: { type: String, trim: true },
    },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Employee code ek company ke andar unique hoga.
userSchema.index(
  { companyId: 1, employeeCode: 1 },
  { unique: true, partialFilterExpression: { employeeCode: { $type: 'string' } } }
);

userSchema.plugin(tenantPlugin);

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, env.bcryptRounds);
});

userSchema.methods.comparePassword = function comparePassword(plain) {
  return bcrypt.compare(plain, this.password);
};

export const User = mongoose.model('User', userSchema);
