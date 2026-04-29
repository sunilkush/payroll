import mongoose from "mongoose";
import { baseFields, softDeletePlugin } from "./common/base.model.js";

const { Schema, model } = mongoose;

const employeeLoanSchema = new Schema({
  ...baseFields,
  name: { type: String, trim: true },
  code: { type: String, trim: true, index: true },
  status: { type: String, default: "active", index: true },
  metadata: { type: Schema.Types.Mixed, default: {} }
}, { timestamps: true });

employeeLoanSchema.index({ companyId: 1, isDeleted: 1 });
employeeLoanSchema.plugin(softDeletePlugin);

export const EmployeeLoan = model("EmployeeLoan", employeeLoanSchema);
