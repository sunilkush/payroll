import RoleTabs from '../../components/RoleTabs.js';

const TABS = [
  { name: 'index', title: 'Punch', icon: 'location-outline' },
  { name: 'attendance', title: 'Attendance', icon: 'time-outline' },
  { name: 'leaves', title: 'Leaves', icon: 'calendar-outline', feature: 'leaveEnabled' },
  { name: 'salary', title: 'Salary', icon: 'document-text-outline', feature: 'payrollEnabled' },
  { name: 'profile', title: 'Profile', icon: 'person-outline' },
];

export default function StaffLayout() {
  return <RoleTabs role="STAFF" tabs={TABS} />;
}
