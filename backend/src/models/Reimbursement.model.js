import mongoose from "mongoose";
import { baseFields, softDeletePlugin } from "./common/base.model.js";

const { Schema, model } = mongoose;

const reimbursementSchema = new Schema({
  ...baseFields,
  name: { type: String, trim: true },
  code: { type: String, trim: true, index: true },
  status: { type: String, default: "active", index: true },
  metadata: { type: Schema.Types.Mixed, default: {} }
}, { timestamps: true });

reimbursementSchema.index({ companyId: 1, isDeleted: 1 });
reimbursementSchema.plugin(softDeletePlugin);

export const Reimbursement = model("Reimbursement", reimbursementSchema);
