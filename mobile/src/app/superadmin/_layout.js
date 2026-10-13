import RoleTabs from '../../components/RoleTabs.js';

const TABS = [
  { name: 'index', title: 'Companies', icon: 'business-outline' },
  { name: 'profile', title: 'Profile', icon: 'person-outline' },
];

export default function SuperAdminLayout() {
  return <RoleTabs role="SUPER_ADMIN" tabs={TABS} />;
}
