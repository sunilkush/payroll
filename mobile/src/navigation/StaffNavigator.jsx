import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import StaffAttendanceScreen from '../screens/staff/StaffAttendanceScreen.jsx';
import StaffCorrectionsScreen from '../screens/staff/StaffCorrectionsScreen.jsx';
import StaffHomeScreen from '../screens/staff/StaffHomeScreen.jsx';
import StaffLeavesScreen from '../screens/staff/StaffLeavesScreen.jsx';
import StaffMeetingsScreen from '../screens/staff/StaffMeetingsScreen.jsx';
import StaffProfileScreen from '../screens/staff/StaffProfileScreen.jsx';
import StaffPunchScreen from '../screens/staff/StaffPunchScreen.jsx';
import StaffSalaryScreen from '../screens/staff/StaffSalaryScreen.jsx';
import { colors, typography } from '../theme/index.js';

const Tab = createBottomTabNavigator();

export default function StaffNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="StaffHome"
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
        name="StaffHome"
        component={StaffHomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, focused, size }) => (
            <MaterialCommunityIcons
              name={focused ? 'home-variant' : 'home-variant-outline'}
              size={size || 24}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="StaffAttendance"
        component={StaffAttendanceScreen}
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
        name="StaffLeaves"
        component={StaffLeavesScreen}
        options={{
          tabBarLabel: 'Leaves',
          tabBarIcon: ({ color, focused, size }) => (
            <MaterialCommunityIcons
              name={focused ? 'calendar-clock' : 'calendar-clock-outline'}
              size={size || 24}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="StaffSalary"
        component={StaffSalaryScreen}
        options={{
          tabBarLabel: 'Payslips',
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
        name="StaffProfile"
        component={StaffProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, focused, size }) => (
            <MaterialCommunityIcons
              name={focused ? 'account-circle' : 'account-circle-outline'}
              size={size || 24}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="StaffPunch"
        component={StaffPunchScreen}
        options={{
          tabBarButton: () => null,
          tabBarItemStyle: { display: 'none' },
        }}
      />
      <Tab.Screen
        name="StaffCorrections"
        component={StaffCorrectionsScreen}
        options={{
          tabBarButton: () => null,
          tabBarItemStyle: { display: 'none' },
        }}
      />
      <Tab.Screen
        name="StaffMeetings"
        component={StaffMeetingsScreen}
        options={{
          tabBarButton: () => null,
          tabBarItemStyle: { display: 'none' },
        }}
      />
    </Tab.Navigator>
  );
}
