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
import AdminReportsScreen from '../screens/admin/AdminReportsScreen.jsx';
import AdminSettingsScreen from '../screens/admin/AdminSettingsScreen.jsx';
import AdminStaffScreen from '../screens/admin/AdminStaffScreen.jsx';
import { borderRadius, colors, typography } from '../theme/index.js';

const Tab = createBottomTabNavigator();

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
          height: 66,
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
        name="AdminHome"
        component={AdminHomeScreen}
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
        name="AdminStaff"
        component={AdminStaffScreen}
        options={{
          tabBarLabel: 'Employees',
          tabBarIcon: ({ color, focused, size }) => (
            <MaterialCommunityIcons
              name={focused ? 'account-group' : 'account-group-outline'}
              size={size || 24}
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
          tabBarIcon: ({ color, focused, size }) => (
            <MaterialCommunityIcons
              name={focused ? 'calendar-check' : 'calendar-check-outline'}
              size={size || 24}
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
          tabBarIcon: ({ color, focused, size }) => (
            <MaterialCommunityIcons
              name={focused ? 'wallet' : 'wallet-outline'}
              size={size || 24}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="AdminReports"
        component={AdminReportsScreen}
        options={{
          tabBarLabel: 'Reports',
          tabBarIcon: ({ color, focused, size }) => (
            <MaterialCommunityIcons
              name={focused ? 'file-chart' : 'file-chart-outline'}
              size={size || 24}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="AdminSettings"
        component={AdminSettingsScreen}
        options={{
          tabBarButton: () => null,
          tabBarItemStyle: { display: 'none' },
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

