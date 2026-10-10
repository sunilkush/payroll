export const ROLES = Object.freeze({
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  STAFF: 'STAFF',
});

export const ROLE_HOME = Object.freeze({
  [ROLES.SUPER_ADMIN]: 'SuperAdminHome',
  [ROLES.ADMIN]: 'AdminHome',
  [ROLES.STAFF]: 'StaffHome',
});

export const ROLE_LABEL = Object.freeze({
  [ROLES.SUPER_ADMIN]: 'Super Admin',
  [ROLES.ADMIN]: 'Company Admin',
  [ROLES.STAFF]: 'Staff',
});

const SALES_MANAGER = { feature: 'salesEnabled', userFlag: 'isSalesManager' };

// MaterialCommunityIcons icon names for React Native
export const ROLE_NAV = Object.freeze({
  [ROLES.SUPER_ADMIN]: [
    { name: 'Dashboard', screen: 'SuperAdminHome', icon: 'view-dashboard-outline', group: 'Overview' },
    { name: 'Companies', screen: 'SuperAdminCompanies', icon: 'domain', group: 'Manage' },
    { name: 'Settings', screen: 'SuperAdminSettings', icon: 'cog-outline', group: 'Configuration' },
  ],
  [ROLES.ADMIN]: [
    { name: 'Dashboard', screen: 'AdminHome', icon: 'view-dashboard-outline', group: 'Overview' },
    { name: 'Staff', screen: 'AdminStaff', icon: 'account-group-outline', group: 'People' },
    { name: 'Attendance', screen: 'AdminAttendance', icon: 'clock-time-four-outline', group: 'People' },
    { name: 'Corrections', screen: 'AdminCorrections', icon: 'timer-sand', group: 'People', feature: 'correctionsEnabled' },
    { name: 'Leaves', screen: 'AdminLeaves', icon: 'calendar-check-outline', group: 'People', feature: 'leaveEnabled' },
    { name: 'Meetings', screen: 'AdminMeetings', icon: 'calendar-clock', group: 'Sales', feature: 'salesEnabled' },
    { name: 'Clients', screen: 'AdminClients', icon: 'store-outline', group: 'Sales', feature: 'salesEnabled' },
    { name: 'Payroll', screen: 'AdminPayroll', icon: 'wallet-outline', group: 'Finance', feature: 'payrollEnabled' },
    { name: 'Settings', screen: 'AdminSettings', icon: 'cog-outline', group: 'Configuration' },
  ],
  [ROLES.STAFF]: [
    { name: 'Dashboard', screen: 'StaffHome', icon: 'view-dashboard-outline', group: 'Overview' },
    { name: 'Punch', screen: 'StaffPunch', icon: 'map-marker-radius-outline', group: 'My work' },
    { name: 'Attendance', screen: 'StaffAttendance', icon: 'clock-time-four-outline', group: 'My work' },
    { name: 'Leaves', screen: 'StaffLeaves', icon: 'calendar-check-outline', group: 'My work', feature: 'leaveEnabled' },
    { name: 'Profile', screen: 'StaffProfile', icon: 'account-circle-outline', group: 'Account' },
  ],
});

export const filterByFeatures = (items = [], company, user) =>
  items.filter((item) => (!item.feature || company?.[item.feature]) && (!item.userFlag || user?.[item.userFlag]));

export const roleLine = (user) => {
  if (!user) return null;
  const label = ROLE_LABEL[user.role];
  return user.name?.trim().toLowerCase() === label?.toLowerCase() ? null : label;
};

export const initials = (name = '') =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
