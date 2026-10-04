export const ROLES = Object.freeze({
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  STAFF: 'STAFF',
});

// Login ke baad har role apne home par jaata hai.
export const ROLE_HOME = Object.freeze({
  [ROLES.SUPER_ADMIN]: '/superadmin',
  [ROLES.ADMIN]: '/admin',
  [ROLES.STAFF]: '/staff',
});

// Navbar ke links. Naya module bane to yahan jodo.
// feature: company ki wo setting jo ON ho tabhi link dikhe (jaise leaveEnabled).
export const ROLE_NAV = Object.freeze({
  [ROLES.SUPER_ADMIN]: [
    { to: '/superadmin', label: 'Dashboard', end: true },
    { to: '/superadmin/companies', label: 'Companies' },
    { to: '/superadmin/settings', label: 'Global Settings' },
  ],
  [ROLES.ADMIN]: [
    { to: '/admin', label: 'Dashboard', end: true },
    { to: '/admin/staff', label: 'Staff' },
    { to: '/admin/attendance', label: 'Attendance' },
    { to: '/admin/leaves', label: 'Leaves', feature: 'leaveEnabled' },
    { to: '/admin/payroll', label: 'Payroll' },
    { to: '/admin/settings', label: 'Settings' },
  ],
  [ROLES.STAFF]: [
    { to: '/staff', label: 'Dashboard', end: true },
    { to: '/staff/punch', label: 'Punch' },
    { to: '/staff/attendance', label: 'My Attendance' },
    { to: '/staff/leaves', label: 'My Leaves', feature: 'leaveEnabled' },
    { to: '/staff/salary', label: 'My Salary' },
  ],
});

// Jo items kisi band feature par depend karte hain unhe hata deta hai.
export const filterByFeatures = (items, company) =>
  items.filter((item) => !item.feature || company?.[item.feature]);

export const ROLE_LABEL = Object.freeze({
  [ROLES.SUPER_ADMIN]: 'Super Admin',
  [ROLES.ADMIN]: 'Company Admin',
  [ROLES.STAFF]: 'Staff',
});
