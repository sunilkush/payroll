import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CalendarCheck, CalendarDays, House, MapPin, Wallet } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import ApplyLeaveScreen from '../screens/staff/ApplyLeaveScreen';
import AttendanceScreen from '../screens/staff/AttendanceScreen';
import HomeScreen from '../screens/staff/HomeScreen';
import LeaveScreen from '../screens/staff/LeaveScreen';
import PunchCorrectionScreen from '../screens/staff/PunchCorrectionScreen';
import PunchScreen from '../screens/staff/PunchScreen';
import SalaryScreen from '../screens/staff/SalaryScreen';
import SalarySlipScreen from '../screens/staff/SalarySlipScreen';
import StaffHolidaysScreen from '../screens/staff/StaffHolidaysScreen';
import VisitCheckInScreen from '../screens/staff/VisitCheckInScreen';
import VisitCompleteScreen from '../screens/staff/VisitCompleteScreen';
import VisitsScreen from '../screens/staff/VisitsScreen';
import { colors } from '../theme';
import { tabIcon, tabScreenOptions } from './tabOptions';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function StaffTabs() {
  const { hasFeature } = useAuth();
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarIcon: tabIcon(House) }} />
      <Tab.Screen name="Attendance" component={AttendanceScreen} options={{ tabBarIcon: tabIcon(CalendarCheck) }} />
      <Tab.Screen name="Leave" component={LeaveScreen} options={{ tabBarIcon: tabIcon(CalendarDays) }} />
      <Tab.Screen name="Salary" component={SalaryScreen} options={{ tabBarIcon: tabIcon(Wallet) }} />
      {/* Client visits sirf tab jab company ke plan mein Sales ho */}
      {hasFeature('sales') && <Tab.Screen name="Visits" component={VisitsScreen} options={{ tabBarIcon: tabIcon(MapPin) }} />}
    </Tab.Navigator>
  );
}

// Staff: tabs + unke upar khulne wali screens (Punch, Punch correction).
export default function StaffNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.paper } }}>
      <Stack.Screen name="Tabs" component={StaffTabs} />
      <Stack.Screen name="Punch" component={PunchScreen} />
      <Stack.Screen name="PunchCorrection" component={PunchCorrectionScreen} />
      <Stack.Screen name="ApplyLeave" component={ApplyLeaveScreen} />
      <Stack.Screen name="StaffHolidays" component={StaffHolidaysScreen} />
      <Stack.Screen name="SalarySlip" component={SalarySlipScreen} />
      <Stack.Screen name="VisitCheckIn" component={VisitCheckInScreen} />
      <Stack.Screen name="VisitComplete" component={VisitCompleteScreen} />
    </Stack.Navigator>
  );
}
