import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Suspense } from "react";
import ProtectedRoute from "./ProtectedRoute";
import PublicLayout from "../layouts/PublicLayout";
import AppLayout from "../layouts/AppLayout";
import SuperAdminLayout from "../layouts/SuperAdminLayout";
import EmployeePortalLayout from "../layouts/EmployeePortalLayout";
import {
  LandingPage,
  LoginPage,
  SignupPage,
  ForgotPasswordPage,
  ResetPasswordPage,
  PricingPage,
} from "../pages/public/SimpleAuthPages";
import CrudModulePage from "../pages/app/CrudModulePage";

export const AppRouter = () => (
  <BrowserRouter>
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route
            path="/reset-password/:token"
            element={<ResetPasswordPage />}
          />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route path="/app" element={<AppLayout />}>
            <Route
              path="dashboard"
              element={
                <CrudModulePage title="Company Dashboard" slice="company" />
              }
            />
            <Route
              path="employees"
              element={<CrudModulePage title="Employees" slice="employee" />}
            />
            <Route
              path="departments"
              element={
                <CrudModulePage title="Departments" slice="department" />
              }
            />
            <Route
              path="designations"
              element={
                <CrudModulePage title="Designations" slice="designation" />
              }
            />
            <Route
              path="locations"
              element={<CrudModulePage title="Locations" slice="location" />}
            />
            <Route
              path="salary/components"
              element={
                <CrudModulePage
                  title="Salary Components"
                  slice="salaryComponent"
                />
              }
            />
            <Route
              path="salary/structures"
              element={
                <CrudModulePage
                  title="Salary Structures"
                  slice="salaryStructure"
                />
              }
            />
            <Route
              path="payroll/runs"
              element={
                <CrudModulePage title="Payroll Runs" slice="payrollRun" />
              }
            />
            <Route
              path="payroll/approvals"
              element={
                <CrudModulePage
                  title="Payroll Approvals"
                  slice="payrollApproval"
                />
              }
            />
            <Route
              path="payslips"
              element={<CrudModulePage title="Payslips" slice="payslip" />}
            />
            <Route
              path="loans"
              element={<CrudModulePage title="Loans" slice="loan" />}
            />
            <Route
              path="reimbursements"
              element={
                <CrudModulePage title="Reimbursements" slice="reimbursement" />
              }
            />
            <Route
              path="tax-declarations"
              element={
                <CrudModulePage
                  title="Tax Declarations"
                  slice="taxDeclaration"
                />
              }
            />
            <Route
              path="reports"
              element={<CrudModulePage title="Reports" slice="report" />}
            />
            <Route
              path="billing"
              element={<CrudModulePage title="Billing" slice="billing" />}
            />
            <Route
              path="settings/company"
              element={
                <CrudModulePage title="Company Settings" slice="setting" />
              }
            />
          </Route>
        </Route>
        <Route path="/employee" element={<EmployeePortalLayout />}>
          <Route
            path="dashboard"
            element={
              <CrudModulePage title="Employee Dashboard" slice="payslip" />
            }
          />
        </Route>
        <Route path="/admin" element={<SuperAdminLayout />}>
          <Route
            path="dashboard"
            element={<CrudModulePage title="Super Admin" slice="superAdmin" />}
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  </BrowserRouter>
);
