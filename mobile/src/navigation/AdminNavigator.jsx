import { StyleSheet, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AdminAttendanceScreen from '../screens/admin/AdminAttendanceScreen.jsx';
import AdminBillingScreen from '../screens/admin/AdminBillingScreen.jsx';
import AdminClientsScreen from '../screens/admin/AdminClientsScreen.jsx';
import AdminCorrectionsScreen from '../screens/admin/AdminCorrectionsScreen.jsx';
import AdminHomeScreen from '../screens/admin/AdminHomeScreen.jsx';
import AdminLeavesScreen from '../screens/admin/AdminLeavesScreen.jsx';
import AdminMeetingsScreen from '../screens/admin/AdminMeetingsScreen.jsx';
import AdminPayrollScreen from '../screens/admin/AdminPayrollScreen.jsx';
import AdminSettingsScreen from '../screens/admin/AdminSettingsScreen.jsx';
import AdminStaffScreen from '../screens/admin/AdminStaffScreen.jsx';
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

export default function AdminNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="AdminHome"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.outlineVariant,
          borderTopWidth: 1,
          height: 70,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: typography.weights.medium,
          letterSpacing: 0.1,
        },
      }}
    >
      <Tab.Screen
        name="AdminHome"
        component={AdminHomeScreen}
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
        name="AdminStaff"
        component={AdminStaffScreen}
        options={{
          tabBarLabel: 'Staff',
          tabBarIcon: ({ color, focused }) => (
            <Md3NavIcon
              icon={focused ? 'account-group' : 'account-group-outline'}
              focused={focused}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="AdminAttendance"
        component={AdminAttendanceScreen}
        options={{
          tabBarLabel: 'Attendance',
          tabBarIcon: ({ color, focused }) => (
            <Md3NavIcon
              icon={focused ? 'calendar-check' : 'calendar-check-outline'}
              focused={focused}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="AdminPayroll"
        component={AdminPayrollScreen}
        options={{
          tabBarLabel: 'Payroll',
          tabBarIcon: ({ color, focused }) => (
            <Md3NavIcon
              icon={focused ? 'wallet' : 'wallet-outline'}
              focused={focused}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="AdminSettings"
        component={AdminSettingsScreen}
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
        name="AdminLeaves"
        component={AdminLeavesScreen}
        options={{
          tabBarButton: () => null,
          tabBarItemStyle: { display: 'none' },
        }}
      />
      <Tab.Screen
        name="AdminCorrections"
        component={AdminCorrectionsScreen}
        options={{
          tabBarButton: () => null,
          tabBarItemStyle: { display: 'none' },
        }}
      />
      <Tab.Screen
        name="AdminBilling"
        component={AdminBillingScreen}
        options={{
          tabBarButton: () => null,
          tabBarItemStyle: { display: 'none' },
        }}
      />
      <Tab.Screen
        name="AdminClients"
        component={AdminClientsScreen}
        options={{
          tabBarButton: () => null,
          tabBarItemStyle: { display: 'none' },
        }}
      />
      <Tab.Screen
        name="AdminMeetings"
        component={AdminMeetingsScreen}
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
