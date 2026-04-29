import { HashRouter, Routes, Route } from "react-router-dom";
import LandingPage from "../pages/LandingPage.jsx";
import LoginPage from "../pages/LoginPage.jsx";
import CompanyDashboardPage from "../pages/CompanyDashboardPage.jsx";
import EmployeeManagementPage from "../pages/EmployeeManagementPage.jsx";
import PayrollRunWizardPage from "../pages/PayrollRunWizardPage.jsx";
import PayrollRunDetailsPage from "../pages/PayrollRunDetailsPage.jsx";
import PayslipListPage from "../pages/PayslipListPage.jsx";
import MyPayslipsPage from "../pages/MyPayslipsPage.jsx";
import ApprovalQueuePage from "../pages/ApprovalQueuePage.jsx";
import SalaryComponentsPage from "../pages/SalaryComponentsPage.jsx";
import SalaryStructureBuilderPage from "../pages/SalaryStructureBuilderPage.jsx";
import TaxDeclarationPage from "../pages/TaxDeclarationPage.jsx";
import LoanAdvancePage from "../pages/LoanAdvancePage.jsx";
import ReimbursementPage from "../pages/ReimbursementPage.jsx";
import ReportsPage from "../pages/ReportsPage.jsx";
import SettingsPage from "../pages/SettingsPage.jsx";
import SubscriptionBillingPage from "../pages/SubscriptionBillingPage.jsx";
import OnboardingWizardPage from "../pages/OnboardingWizardPage.jsx";
import SuperAdminDashboardPage from "../pages/SuperAdminDashboardPage.jsx";
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