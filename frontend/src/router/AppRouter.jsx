import { BrowserRouter, Route, Routes } from "react-router-dom";
import LandingPage from "../pages/LandingPage";
import LoginPage from "../pages/LoginPage";
import CompanyDashboardPage from "../pages/CompanyDashboardPage";
import EmployeeManagementPage from "../pages/EmployeeManagementPage";
import PayrollRunWizardPage from "../pages/PayrollRunWizardPage";
import PayrollRunDetailsPage from "../pages/PayrollRunDetailsPage";
import PayslipListPage from "../pages/PayslipListPage";
import MyPayslipsPage from "../pages/MyPayslipsPage";
import ApprovalQueuePage from "../pages/ApprovalQueuePage";
import SalaryComponentsPage from "../pages/SalaryComponentsPage";
import SalaryStructureBuilderPage from "../pages/SalaryStructureBuilderPage";
import TaxDeclarationPage from "../pages/TaxDeclarationPage";
import LoanAdvancePage from "../pages/LoanAdvancePage";
import ReimbursementPage from "../pages/ReimbursementPage";
import ReportsPage from "../pages/ReportsPage";
import SettingsPage from "../pages/SettingsPage";
import SubscriptionBillingPage from "../pages/SubscriptionBillingPage";
import OnboardingWizardPage from "../pages/OnboardingWizardPage";
import SuperAdminDashboardPage from "../pages/SuperAdminDashboardPage";

export const AppRouter = () => (
  <BrowserRouter>
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
  </BrowserRouter>
);
