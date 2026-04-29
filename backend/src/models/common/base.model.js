import mongoose from "mongoose";

const { Schema } = mongoose;

export const baseFields = {
  companyId: { type: Schema.Types.ObjectId, ref: "Company", index: true },
  createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  isActive: { type: Boolean, default: true, index: true },
  isDeleted: { type: Boolean, default: false, index: true }
};

export const softDeletePlugin = (schema) => {
  schema.methods.softDelete = async function (userId) {
    this.isDeleted = true;
    this.isActive = false;
    this.updatedBy = userId;
    return this.save();
  };

  schema.pre(/^find/, function () {
    if (!this.getOptions().withDeleted) {
      this.where({ isDeleted: false });
    }
  });
};
