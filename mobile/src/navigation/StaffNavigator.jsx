import { StyleSheet, View } from 'react-native';
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

export default function StaffNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="StaffHome"
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
        name="StaffHome"
        component={StaffHomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Md3NavIcon
              icon={focused ? 'home-variant' : 'home-variant-outline'}
              focused={focused}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="StaffPunch"
        component={StaffPunchScreen}
        options={{
          tabBarLabel: 'Punch',
          tabBarIcon: ({ color, focused }) => (
            <Md3NavIcon
              icon={focused ? 'fingerprint' : 'fingerprint'}
              focused={focused}
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
        name="StaffLeaves"
        component={StaffLeavesScreen}
        options={{
          tabBarLabel: 'Leaves',
          tabBarIcon: ({ color, focused }) => (
            <Md3NavIcon
              icon={focused ? 'calendar-arrow-right' : 'calendar-arrow-right'}
              focused={focused}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="StaffSalary"
        component={StaffSalaryScreen}
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
        name="StaffProfile"
        component={StaffProfileScreen}
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
