import RoleHome from '../../components/RoleHome/RoleHome.jsx';

const MODULES = [
  { name: 'Staff', description: 'Staff add/edit aur salary structure.', to: '/admin/staff' },
  {
    name: 'Attendance',
    description: 'Monthly attendance report aur missed punch-outs.',
    to: '/admin/attendance',
  },
  {
    name: 'Leave Requests',
    description: 'CL/EL requests approve ya reject karna.',
    to: '/admin/leaves',
    feature: 'leaveEnabled',
  },
  { name: 'Payroll', description: 'Salary generate karna, slips aur Excel nikalna.', to: '/admin/payroll' },
  {
    name: 'Settings',
    description: 'Office location, range, week off, holidays aur PF/ESI ON/OFF.',
    to: '/admin/settings',
  },
];

export default function AdminHome() {
  return <RoleHome title="Company Dashboard" modules={MODULES} />;
}
