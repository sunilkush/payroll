import RoleHome from '../../components/RoleHome/RoleHome.jsx';

const MODULES = [
  {
    name: 'Companies',
    description: 'Company create, edit, block karna aur company admins banana.',
    to: '/superadmin/companies',
  },
  {
    name: 'Global Settings',
    description: 'PF/ESI rates, ceilings aur payroll ke rules.',
    to: '/superadmin/settings',
  },
];

export default function SuperAdminHome() {
  return <RoleHome title="Super Admin Dashboard" modules={MODULES} />;
}
