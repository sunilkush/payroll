import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ROLES, ROLE_HOME } from '../utils/roles.js';
import ProtectedRoute from './ProtectedRoute.jsx';
import AppLayout from '../components/AppLayout/AppLayout.jsx';
import Loader from '../components/Loader/Loader.jsx';
import Login from '../pages/Login/Login.jsx';
import SuperAdminHome from '../pages/superadmin/SuperAdminHome.jsx';
import Companies from '../pages/superadmin/Companies/Companies.jsx';
import CompanyDetail from '../pages/superadmin/CompanyDetail/CompanyDetail.jsx';
import AdminHome from '../pages/admin/AdminHome.jsx';
import Staff from '../pages/admin/Staff/Staff.jsx';
import StaffForm from '../pages/admin/StaffForm/StaffForm.jsx';
import Attendance from '../pages/admin/Attendance/Attendance.jsx';
import StaffAttendance from '../pages/admin/StaffAttendance/StaffAttendance.jsx';
import LeaveRequests from '../pages/admin/LeaveRequests/LeaveRequests.jsx';
import PunchCorrections from '../pages/admin/PunchCorrections/PunchCorrections.jsx';
import Clients from '../pages/admin/Clients/Clients.jsx';
import ClientForm from '../pages/admin/ClientForm/ClientForm.jsx';
import Meetings from '../pages/admin/Meetings/Meetings.jsx';
import MeetingForm from '../pages/admin/MeetingForm/MeetingForm.jsx';
import MeetingDetail from '../pages/admin/MeetingDetail/MeetingDetail.jsx';
import Settings from '../pages/admin/Settings/Settings.jsx';
import MyCorrections from '../pages/staff/MyCorrections/MyCorrections.jsx';
import MyMeetings from '../pages/staff/MyMeetings/MyMeetings.jsx';
import MeetingVisit from '../pages/staff/MeetingVisit/MeetingVisit.jsx';
import ScanMeeting from '../pages/staff/ScanMeeting/ScanMeeting.jsx';
import MyLeaves from '../pages/staff/MyLeaves/MyLeaves.jsx';
import MySalary from '../pages/staff/MySalary/MySalary.jsx';
import Payroll from '../pages/admin/Payroll/Payroll.jsx';
import GlobalSettings from '../pages/superadmin/GlobalSettings/GlobalSettings.jsx';
import StaffHome from '../pages/staff/StaffHome.jsx';
import PunchScreen from '../pages/staff/PunchScreen/PunchScreen.jsx';
import MyAttendance from '../pages/staff/MyAttendance/MyAttendance.jsx';

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  return <Navigate to={user ? ROLE_HOME[user.role] : '/login'} replace />;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

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
          <Route path="/admin/corrections" element={<PunchCorrections />} />
          <Route path="/admin/clients" element={<Clients />} />
          <Route path="/admin/clients/new" element={<ClientForm />} />
          <Route path="/admin/clients/:id" element={<ClientForm key="edit" />} />
          <Route path="/admin/meetings" element={<Meetings />} />
          <Route path="/admin/meetings/new" element={<MeetingForm />} />
          <Route path="/admin/meetings/:id" element={<MeetingDetail />} />
          <Route path="/admin/meetings/:id/edit" element={<MeetingForm key="edit" />} />
          <Route path="/admin/leaves" element={<LeaveRequests />} />
          <Route path="/admin/payroll" element={<Payroll />} />
          <Route path="/admin/settings" element={<Settings />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={[ROLES.STAFF]} />}>
        <Route element={<AppLayout />}>
          <Route path="/staff" element={<StaffHome />} />
          <Route path="/staff/punch" element={<PunchScreen />} />
          <Route path="/staff/attendance" element={<MyAttendance />} />
          <Route path="/staff/corrections" element={<MyCorrections />} />
          <Route path="/staff/meetings" element={<MyMeetings />} />
          <Route path="/staff/meetings/:id" element={<MeetingVisit />} />
          <Route path="/staff/scan" element={<ScanMeeting />} />
          <Route path="/staff/leaves" element={<MyLeaves />} />
          <Route path="/staff/salary" element={<MySalary />} />
        </Route>
      </Route>

      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  );
}
