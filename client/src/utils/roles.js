import {
  BankOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  DashboardOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  SettingOutlined,
  TeamOutlined,
  WalletOutlined,
} from '@ant-design/icons';

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

// Sidebar / drawer ke links. Naya module bane to yahan jodo.
// icon: Ant Design ka icon component.
// feature: company ki wo setting jo ON ho tabhi link dikhe (jaise leaveEnabled).
export const ROLE_NAV = Object.freeze({
  [ROLES.SUPER_ADMIN]: [
    { to: '/superadmin', label: 'Dashboard', icon: DashboardOutlined, end: true },
    { to: '/superadmin/companies', label: 'Companies', icon: BankOutlined },
    { to: '/superadmin/settings', label: 'Global Settings', icon: SettingOutlined },
  ],
  [ROLES.ADMIN]: [
    { to: '/admin', label: 'Dashboard', icon: DashboardOutlined, end: true },
    { to: '/admin/staff', label: 'Staff', icon: TeamOutlined },
    { to: '/admin/attendance', label: 'Attendance', icon: ClockCircleOutlined },
    { to: '/admin/leaves', label: 'Leaves', icon: CalendarOutlined, feature: 'leaveEnabled' },
    { to: '/admin/payroll', label: 'Payroll', icon: WalletOutlined },
    { to: '/admin/settings', label: 'Settings', icon: SettingOutlined },
  ],
  [ROLES.STAFF]: [
    { to: '/staff', label: 'Dashboard', icon: DashboardOutlined, end: true },
    { to: '/staff/punch', label: 'Punch', icon: EnvironmentOutlined },
    { to: '/staff/attendance', label: 'My Attendance', icon: ClockCircleOutlined },
    { to: '/staff/leaves', label: 'My Leaves', icon: CalendarOutlined, feature: 'leaveEnabled' },
    { to: '/staff/salary', label: 'My Salary', icon: FileTextOutlined },
  ],
});

// Jo items kisi band feature par depend karte hain unhe hata deta hai.
export const filterByFeatures = (items, company) =>
  items.filter((item) => !item.feature || company?.[item.feature]);

// Chalu URL ke liye menu ka kaun sa link active hai: "end" wale links poora match,
// baaki shuruaat se (/admin/staff/123 -> Staff). Sabse lamba match jeetta hai.
export const activeLink = (links, pathname) =>
  links
    .filter((link) => (link.end ? pathname === link.to : pathname.startsWith(link.to)))
    .sort((a, b) => b.to.length - a.to.length)[0];

export const ROLE_LABEL = Object.freeze({
  [ROLES.SUPER_ADMIN]: 'Super Admin',
  [ROLES.ADMIN]: 'Company Admin',
  [ROLES.STAFF]: 'Staff',
});

// Naam ke neeche dikhane wala role. Naam hi role jaisa ho (jaise user "Super Admin" ka role
// "Super Admin") to null, taaki wahi shabd do baar na dikhe.
export const roleLine = (user) => {
  const label = ROLE_LABEL[user.role];
  return user.name.trim().toLowerCase() === label.toLowerCase() ? null : label;
};

// "Rajesh Kumar Sharma" -> "RK" (avatar ke liye)
export const initials = (name = '') =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
