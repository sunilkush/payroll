import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { ROLES, useAuth } from '../context/AuthContext';
import UnsupportedRoleScreen from '../screens/UnsupportedRoleScreen';
import { colors } from '../theme';
import AdminNavigator from './AdminNavigator';
import AuthStack from './AuthStack';
import StaffTabs from './StaffTabs';

const navigationTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.paper, card: colors.card, text: colors.ink, border: colors.line, primary: colors.ink },
};

// Password reset ka link app mein khule: payroster://reset-password?token=... -> ResetPassword (route.params.token).
// Email ka link web app ka hota hai (https://.../reset-password?token=...). Use bhi app mein kholna ho to
// EXPO_PUBLIC_WEB_URL mein web app ka URL do, aur us domain par Android App Links / iOS Universal Links lagao.
const webUrl = (process.env.EXPO_PUBLIC_WEB_URL || '').trim().replace(/\/+$/, '');
const linking = {
  prefixes: [Linking.createURL('/'), ...(webUrl ? [webUrl] : [])],
  config: { screens: { ResetPassword: 'reset-password' } },
};

// Kaun sa navigator dikhega ye login aur role se tay hota hai (asli permission check server par hai):
//   login nahi / email verify nahi -> AuthStack        STAFF -> StaffTabs        ADMIN -> AdminNavigator
function Navigator() {
  const { user, role } = useAuth();
  if (!user || user.emailVerified === false) return <AuthStack />;
  if (role === ROLES.STAFF) return <StaffTabs />;
  if (role === ROLES.ADMIN) return <AdminNavigator />;
  return <UnsupportedRoleScreen />;
}

// App.js ise tabhi dikhata hai jab fonts aur saved login aa chuke hon (tab tak splash screen).
export default function RootNavigator() {
  return (
    <NavigationContainer theme={navigationTheme} linking={linking}>
      <Navigator />
    </NavigationContainer>
  );
}
