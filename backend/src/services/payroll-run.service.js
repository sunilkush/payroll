import mongoose from "mongoose";
import { PayrollRun, PayrollRunItem } from "../models/index.js";
import { calculatePayrollItem } from "./payroll-calculation.service.js";

export const finalizePayrollRun = async ({ payrollRunId, actorId }) => {
  const session = await mongoose.startSession();
  return session.withTransaction(async () => {
    const run = await PayrollRun.findById(payrollRunId).session(session);
    if (!run || run.status === "locked") throw new Error("Invalid payroll run");
    const items = await PayrollRunItem.find({ companyId: run.companyId, payrollRunId }).session(session);
    for (const item of items) {
      const result = calculatePayrollItem(item.snapshot || {});
      item.grossSalary = result.grossSalary;
      item.totalDeductions = result.totalDeductions;
      item.netSalary = result.netSalary;
      await item.save({ session });
    }
    run.status = "locked";
    run.updatedBy = actorId;
    await run.save({ session });
    return run;
  }).finally(()=>session.endSession());
};
