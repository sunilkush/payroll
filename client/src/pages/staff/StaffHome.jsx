import RoleHome from '../../components/RoleHome/RoleHome.jsx';

const MODULES = [
  { name: 'Punch In / Out', description: 'Office range ke andar attendance lagana.', to: '/staff/punch' },
  { name: 'My Attendance', description: 'Apni monthly attendance dekhna.', to: '/staff/attendance' },
  {
    name: 'My Leaves',
    description: 'Leave apply karna aur balance dekhna.',
    to: '/staff/leaves',
    feature: 'leaveEnabled',
  },
  { name: 'My Salary', description: 'Salary slips dekhna aur download karna.', to: '/staff/salary' },
];

export default function StaffHome() {
  return <RoleHome title="My Dashboard" modules={MODULES} />;
}
