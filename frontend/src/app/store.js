import { configureStore } from "@reduxjs/toolkit";
import auth from "../slices/auth.slice";
import { createCrudSlice } from "../features/baseSliceFactory";

const moduleDefs = {
  company: "/companies", employee: "/employees", department: "/departments", designation: "/designations", location: "/locations",
  salaryComponent: "/salary-components", salaryStructure: "/salary-structures", payrollRun: "/payroll-runs", payrollApproval: "/payroll-approvals",
  payslip: "/payslips", loan: "/employee-loans", reimbursement: "/reimbursements", taxDeclaration: "/tax-declarations", report: "/reports",
  billing: "/billing", superAdmin: "/admin/overview", setting: "/settings"
};
export const asyncActions = {};
const reducers = { auth };
Object.entries(moduleDefs).forEach(([key, endpoint]) => { const c = createCrudSlice({ name: key, endpoint }); reducers[key] = c.reducer; asyncActions[key] = c; });
export const store = configureStore({ reducer: reducers });
