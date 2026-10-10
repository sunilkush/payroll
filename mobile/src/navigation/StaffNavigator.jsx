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
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.bgCard,
          borderTopColor: colors.border,
          height: 64,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: typography.weights.medium,
        },
      }}
    >
      <Tab.Screen
        name="StaffHome"
        component={StaffHomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home-variant-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="StaffAttendance"
        component={StaffAttendanceScreen}
        options={{
          tabBarLabel: 'Attendance',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="calendar-check-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="StaffSalary"
        component={StaffSalaryScreen}
        options={{
          tabBarLabel: 'Payroll',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="wallet-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="StaffProfile"
        component={StaffProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-circle-outline" size={size} color={color} />
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
        name="StaffLeaves"
        component={StaffLeavesScreen}
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
