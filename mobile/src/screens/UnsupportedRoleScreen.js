import { MonitorSmartphone } from 'lucide-react-native';
import { Card, EmptyState, Header, Screen, SecondaryButton } from '../components';
import { useAuth } from '../context/AuthContext';

// Super Admin ka kaam (companies, packages) web app par hota hai; mobile app sirf admin aur staff ke liye hai.
export default function UnsupportedRoleScreen() {
  const { user, logout } = useAuth();
  return (
    <Screen>
      <Header title="Use the web app" subtitle={user?.email} />
      <Card>
        <EmptyState
          icon={MonitorSmartphone}
          title="Super Admin is not on mobile"
          message="Manage companies and packages from the web app. This app is for company admins and staff."
        />
      </Card>
      <SecondaryButton title="Log out" onPress={logout} danger />
    </Screen>
  );
}
