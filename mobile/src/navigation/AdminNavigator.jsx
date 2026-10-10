import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AdminAttendancePlaceholder from '../screens/admin/AdminAttendancePlaceholder.jsx';
import AdminHomeScreen from '../screens/admin/AdminHomeScreen.jsx';
import AdminLeavesPlaceholder from '../screens/admin/AdminLeavesPlaceholder.jsx';
import AdminMoreScreen from '../screens/admin/AdminMoreScreen.jsx';
import AdminStaffPlaceholder from '../screens/admin/AdminStaffPlaceholder.jsx';
import { colors, typography } from '../theme/index.js';

const Tab = createBottomTabNavigator();

export default function AdminNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="AdminHome"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
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
        name="AdminHome"
        component={AdminHomeScreen}
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="view-dashboard-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="AdminStaff"
        component={AdminStaffPlaceholder}
        options={{
          tabBarLabel: 'Staff',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-group-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="AdminAttendance"
        component={AdminAttendancePlaceholder}
        options={{
          tabBarLabel: 'Attendance',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="clock-time-four-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="AdminLeaves"
        component={AdminLeavesPlaceholder}
        options={{
          tabBarLabel: 'Leaves',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="calendar-check-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="AdminMore"
        component={AdminMoreScreen}
        options={{
          tabBarLabel: 'More',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="dots-horizontal-circle-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
