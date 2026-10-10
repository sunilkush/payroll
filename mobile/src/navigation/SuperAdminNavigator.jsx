import { StyleSheet, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import SuperAdminCompanyDetailScreen from '../screens/superadmin/SuperAdminCompanyDetailScreen.jsx';
import SuperAdminCompaniesScreen from '../screens/superadmin/SuperAdminCompaniesScreen.jsx';
import SuperAdminHomeScreen from '../screens/superadmin/SuperAdminHomeScreen.jsx';
import SuperAdminSettingsScreen from '../screens/superadmin/SuperAdminSettingsScreen.jsx';
import { borderRadius, colors, typography } from '../theme/index.js';

const Tab = createBottomTabNavigator();

function Md3NavIcon({ icon, focused, color }) {
  return (
    <View style={[styles.iconContainer, focused && styles.activePill]}>
      <MaterialCommunityIcons
        name={icon}
        size={22}
        color={focused ? colors.onPrimaryContainer : color}
      />
    </View>
  );
}

export default function SuperAdminNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="SuperAdminHome"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.outlineVariant,
          borderTopWidth: 1,
          height: 68,
          paddingBottom: 10,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: typography.weights.medium,
          letterSpacing: 0.1,
        },
      }}
    >
      <Tab.Screen
        name="SuperAdminHome"
        component={SuperAdminHomeScreen}
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color, focused }) => (
            <Md3NavIcon
              icon={focused ? 'view-dashboard' : 'view-dashboard-outline'}
              focused={focused}
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
          tabBarIcon: ({ color, focused }) => (
            <Md3NavIcon
              icon={focused ? 'domain' : 'domain'}
              focused={focused}
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
          tabBarIcon: ({ color, focused }) => (
            <Md3NavIcon
              icon={focused ? 'cog' : 'cog-outline'}
              focused={focused}
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

const styles = StyleSheet.create({
  iconContainer: {
    paddingHorizontal: 16,
    paddingVertical: 3,
    borderRadius: borderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activePill: {
    backgroundColor: colors.primaryContainer,
  },
});
