import Loader from '../components/common/Loader.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { ROLES } from '../utils/roles.js';
import AdminNavigator from './AdminNavigator.jsx';
import AuthNavigator from './AuthNavigator.jsx';
import StaffNavigator from './StaffNavigator.jsx';
import SuperAdminNavigator from './SuperAdminNavigator.jsx';

export default function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return <Loader message="Connecting to PayRoster..." />;
  }

  if (!user) {
    return <AuthNavigator />;
  }

  switch (user.role) {
    case ROLES.STAFF:
      return <StaffNavigator />;
    case ROLES.ADMIN:
      return <AdminNavigator />;
    case ROLES.SUPER_ADMIN:
      return <SuperAdminNavigator />;
    default:
      return <AuthNavigator />;
  }
}
