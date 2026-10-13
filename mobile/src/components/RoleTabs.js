import { Redirect, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ROLE_HOME, useAuth } from '../context/AuthContext.js';
import { colors } from '../theme.js';

// Ek role ke neeche wale tabs. tabs: [{ name, title, icon, feature }]
//   feature  company ki wo setting jo ON ho tabhi tab dikhe (jaise leaveEnabled)
// Doosre role ka user is hisse mein aa jaye to apne home par bhej dete hain.
export default function RoleTabs({ role, tabs }) {
  const { user, company } = useAuth();
  if (user.role !== role) return <Redirect href={ROLE_HOME[user.role]} />;

  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: colors.textMuted }}>
      {tabs.map(({ name, title, icon, feature }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            // href: null tab ko chhupa deta hai (feature plan / settings mein band ho)
            ...(feature && !company?.[feature] ? { href: null } : {}),
            tabBarIcon: ({ color, size }) => <Ionicons name={icon} color={color} size={size} />,
          }}
        />
      ))}
    </Tabs>
  );
}
