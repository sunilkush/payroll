import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import SuperAdminCompanyDetailScreen from '../screens/superadmin/SuperAdminCompanyDetailScreen.jsx';
import SuperAdminCompaniesScreen from '../screens/superadmin/SuperAdminCompaniesScreen.jsx';
import SuperAdminHomeScreen from '../screens/superadmin/SuperAdminHomeScreen.jsx';
import SuperAdminSettingsScreen from '../screens/superadmin/SuperAdminSettingsScreen.jsx';
import { colors, typography } from '../theme/index.js';

const Tab = createBottomTabNavigator();

export default function SuperAdminNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="SuperAdminHome"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: typography.weights.semibold,
          letterSpacing: 0.1,
        },
      }}
    >
      <Tab.Screen
        name="SuperAdminHome"
        component={SuperAdminHomeScreen}
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color, focused, size }) => (
            <MaterialCommunityIcons
              name={focused ? 'view-dashboard' : 'view-dashboard-outline'}
              size={size || 24}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="SuperAdminCompanies"
        component={SuperAdminCompaniesScreen}
        options={{
          tabBarLabel: 'Companies',
          tabBarIcon: ({ color, focused, size }) => (
            <MaterialCommunityIcons
              name={focused ? 'domain' : 'domain'}
              size={size || 24}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="SuperAdminSettings"
        component={SuperAdminSettingsScreen}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color, focused, size }) => (
            <MaterialCommunityIcons
              name={focused ? 'cog' : 'cog-outline'}
              size={size || 24}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="SuperAdminCompanyDetail"
        component={SuperAdminCompanyDetailScreen}
        options={{
          tabBarButton: () => null,
          tabBarItemStyle: { display: 'none' },
        }}
      />
    </Tab.Navigator>
  );
}
