import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ROLES, ROLE_HOME } from '../utils/roles.js';
import PlanGate from './PlanGate.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';
import AppLayout from '../components/AppLayout/AppLayout.jsx';
import Loader from '../components/Loader/Loader.jsx';

// ────────────────────────────────────────────────────────────────────────────────
// Lazy imports: har page apna alag chunk banta hai, user jab page khole tabhi download hota hai.
// Pehle saare ~35 pages ek hi bundle mein the — ab sirf zaroorat ka code load hoga.
// ────────────────────────────────────────────────────────────────────────────────

// Public pages
const Landing        = lazy(() => import('../pages/Landing/Landing.jsx'));
const Login          = lazy(() => import('../pages/Login/Login.jsx'));
const Register       = lazy(() => import('../pages/Register/Register.jsx'));
const ForgotPassword = lazy(() => import('../pages/Account/ForgotPassword.jsx'));
const ResetPassword  = lazy(() => import('../pages/Account/ResetPassword.jsx'));
const VerifyEmail    = lazy(() => import('../pages/Account/VerifyEmail.jsx'));

// Shared pages
const FollowUps      = lazy(() => import('../pages/FollowUps/FollowUps.jsx'));

// Super Admin pages
const SuperAdminHome = lazy(() => import('../pages/superadmin/SuperAdminHome.jsx'));
const Companies      = lazy(() => import('../pages/superadmin/Companies/Companies.jsx'));
const CompanyDetail  = lazy(() => import('../pages/superadmin/CompanyDetail/CompanyDetail.jsx'));
const GlobalSettings = lazy(() => import('../pages/superadmin/GlobalSettings/GlobalSettings.jsx'));

// Admin pages
const AdminHome       = lazy(() => import('../pages/admin/AdminHome.jsx'));
const Staff           = lazy(() => import('../pages/admin/Staff/Staff.jsx'));
const StaffForm       = lazy(() => import('../pages/admin/StaffForm/StaffForm.jsx'));
const Attendance      = lazy(() => import('../pages/admin/Attendance/Attendance.jsx'));
const StaffAttendance = lazy(() => import('../pages/admin/StaffAttendance/StaffAttendance.jsx'));
const LeaveRequests   = lazy(() => import('../pages/admin/LeaveRequests/LeaveRequests.jsx'));
const PunchCorrections = lazy(() => import('../pages/admin/PunchCorrections/PunchCorrections.jsx'));
const Clients         = lazy(() => import('../pages/admin/Clients/Clients.jsx'));
const ClientForm      = lazy(() => import('../pages/admin/ClientForm/ClientForm.jsx'));
const Meetings        = lazy(() => import('../pages/admin/Meetings/Meetings.jsx'));
const MeetingForm     = lazy(() => import('../pages/admin/MeetingForm/MeetingForm.jsx'));
const MeetingDetail   = lazy(() => import('../pages/admin/MeetingDetail/MeetingDetail.jsx'));
const Settings        = lazy(() => import('../pages/admin/Settings/Settings.jsx'));
const Payroll         = lazy(() => import('../pages/admin/Payroll/Payroll.jsx'));
const Billing         = lazy(() => import('../pages/admin/Billing/Billing.jsx'));

// Staff pages
const StaffHome      = lazy(() => import('../pages/staff/StaffHome.jsx'));
const PunchScreen    = lazy(() => import('../pages/staff/PunchScreen/PunchScreen.jsx'));
const MyAttendance   = lazy(() => import('../pages/staff/MyAttendance/MyAttendance.jsx'));
const MyCorrections  = lazy(() => import('../pages/staff/MyCorrections/MyCorrections.jsx'));
const MyMeetings     = lazy(() => import('../pages/staff/MyMeetings/MyMeetings.jsx'));
const MeetingVisit   = lazy(() => import('../pages/staff/MeetingVisit/MeetingVisit.jsx'));
const ScanMeeting    = lazy(() => import('../pages/staff/ScanMeeting/ScanMeeting.jsx'));
const MyLeaves       = lazy(() => import('../pages/staff/MyLeaves/MyLeaves.jsx'));
const MySalary       = lazy(() => import('../pages/staff/MySalary/MySalary.jsx'));

// Plan ke peeche wale pages (server ke PLAN_FEATURES jaisa): plan mein na ho to PlanGate upgrade ka message dikhata hai.
const PAYROLL = { flag: 'payrollEnabled', name: 'Payroll', plan: 'Starter' };
const CORRECTIONS = { flag: 'correctionsEnabled', name: 'Punch corrections', plan: 'Starter' };

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  return <Navigate to={user ? ROLE_HOME[user.role] : '/login'} replace />;
}

// Phone par "install" kiya hua app (PWA): wahan marketing page nahi, seedha login.
const isInstalledApp = () => window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;

// "/": login hua user apne dashboard par; baaki ko public landing page.
function Home() {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  if (user) return <Navigate to={ROLE_HOME[user.role]} replace />;
  if (isInstalledApp()) return <Navigate to="/login" replace />;
  return (
    <Suspense fallback={<Loader />}>
      <Landing />
    </Suspense>
  );
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<Loader />}>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route element={<ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN]} />}>
        <Route element={<AppLayout />}>
          <Route path="/superadmin" element={<SuperAdminHome />} />
          <Route path="/superadmin/companies" element={<Companies />} />
          <Route path="/superadmin/companies/:id" element={<CompanyDetail />} />
          <Route path="/superadmin/settings" element={<GlobalSettings />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={[ROLES.ADMIN]} />}>
        <Route element={<AppLayout />}>
          <Route path="/admin" element={<AdminHome />} />
          <Route path="/admin/staff" element={<Staff />} />
          <Route path="/admin/staff/new" element={<StaffForm />} />
          <Route path="/admin/staff/:id" element={<StaffForm key="edit" />} />
          <Route path="/admin/attendance" element={<Attendance />} />
          <Route path="/admin/attendance/:userId" element={<StaffAttendance />} />
          <Route path="/admin/corrections" element={<PlanGate {...CORRECTIONS}><PunchCorrections /></PlanGate>} />
          <Route path="/admin/clients" element={<Clients />} />
          <Route path="/admin/clients/new" element={<ClientForm />} />
          <Route path="/admin/clients/:id" element={<ClientForm key="edit" />} />
          <Route path="/admin/follow-ups" element={<FollowUps />} />
          <Route path="/admin/meetings" element={<Meetings />} />
          <Route path="/admin/meetings/new" element={<MeetingForm />} />
          <Route path="/admin/meetings/:id" element={<MeetingDetail />} />
          <Route path="/admin/meetings/:id/edit" element={<MeetingForm key="edit" />} />
          <Route path="/admin/leaves" element={<LeaveRequests />} />
          <Route path="/admin/payroll" element={<PlanGate {...PAYROLL}><Payroll /></PlanGate>} />
          <Route path="/admin/billing" element={<Billing />} />
          <Route path="/admin/settings" element={<Settings />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={[ROLES.STAFF]} />}>
        <Route element={<AppLayout />}>
          <Route path="/staff" element={<StaffHome />} />
          <Route path="/staff/punch" element={<PunchScreen />} />
          <Route path="/staff/attendance" element={<MyAttendance />} />
          <Route path="/staff/corrections" element={<PlanGate {...CORRECTIONS}><MyCorrections /></PlanGate>} />
          <Route path="/staff/follow-ups" element={<FollowUps />} />
          <Route path="/staff/meetings" element={<MyMeetings />} />
          <Route path="/staff/meetings/:id" element={<MeetingVisit />} />
          <Route path="/staff/scan" element={<ScanMeeting />} />
          <Route path="/staff/leaves" element={<MyLeaves />} />
          <Route path="/staff/salary" element={<PlanGate {...PAYROLL} name="Salary slips"><MySalary /></PlanGate>} />
        </Route>
      </Route>

      <Route path="*" element={<HomeRedirect />} />
    </Routes>
    </Suspense>
  );
}
