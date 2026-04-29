import { HashRouter, Routes, Route } from "react-router-dom";
import LandingPage from "../pages/LandingPage.jsx";
import LoginPage from "../pages/LoginPage.jsx";
import CompanyDashboardPage from "../pages/CompanyDashboardPage.jsx";

export const AppRouter = () => (
  <HashRouter>
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard" element={<CompanyDashboardPage />} />
      <Route path="/employees" element={<EmployeeManagementPage />} />
      <Route path="/payroll-runs" element={<PayrollRunWizardPage />} />
      <Route path="/payroll-runs/:id" element={<PayrollRunDetailsPage />} />
      <Route path="/payslips" element={<PayslipListPage />} />
      <Route path="/my-payslips" element={<MyPayslipsPage />} />
      <Route path="/approval-queue" element={<ApprovalQueuePage />} />
      <Route path="/salary-components" element={<SalaryComponentsPage />} />
      <Route path="/salary-structure" element={<SalaryStructureBuilderPage />} />
      <Route path="/tax-declarations" element={<TaxDeclarationPage />} />
      <Route path="/loans-advances" element={<LoanAdvancePage />} />
      <Route path="/reimbursements" element={<ReimbursementPage />} />
      <Route path="/reports" element={<ReportsPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/billing" element={<SubscriptionBillingPage />} />
      <Route path="/onboarding" element={<OnboardingWizardPage />} />
      <Route path="/super-admin" element={<SuperAdminDashboardPage />} />
    </Routes>
  </HashRouter>
);