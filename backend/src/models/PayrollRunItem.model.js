import mongoose from "mongoose";
import { baseFields, softDeletePlugin } from "./common/base.model.js";

const { Schema, model } = mongoose;

const payrollRunItemSchema = new Schema({
  ...baseFields,
  name: { type: String, trim: true },
  code: { type: String, trim: true, index: true },
  status: { type: String, default: "active", index: true },
  metadata: { type: Schema.Types.Mixed, default: {} }
}, { timestamps: true });

payrollRunItemSchema.index({ companyId: 1, isDeleted: 1 });
payrollRunItemSchema.plugin(softDeletePlugin);

export const PayrollRunItem = model("PayrollRunItem", payrollRunItemSchema);
