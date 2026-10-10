import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import SuperAdminCompaniesPlaceholder from '../screens/superadmin/SuperAdminCompaniesPlaceholder.jsx';
import SuperAdminHomeScreen from '../screens/superadmin/SuperAdminHomeScreen.jsx';
import SuperAdminSettingsPlaceholder from '../screens/superadmin/SuperAdminSettingsPlaceholder.jsx';
import { colors, typography } from '../theme/index.js';

const Tab = createBottomTabNavigator();

export default function SuperAdminNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="SuperAdminHome"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.danger,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.bgCard,
          borderTopColor: colors.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: typography.weights.medium,
        },
      }}
    >
      <Tab.Screen
        name="SuperAdminHome"
        component={SuperAdminHomeScreen}
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="view-dashboard-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="SuperAdminCompanies"
        component={SuperAdminCompaniesPlaceholder}
        options={{
          tabBarLabel: 'Companies',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="domain" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="SuperAdminSettings"
        component={SuperAdminSettingsPlaceholder}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cog-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
