import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Briefcase, ClipboardCheck, IndianRupee, Sun, Users } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import ApprovalsScreen from '../screens/admin/ApprovalsScreen';
import ClientFormScreen from '../screens/admin/ClientFormScreen';
import ClientsScreen from '../screens/admin/ClientsScreen';
import HolidayFormScreen from '../screens/admin/HolidayFormScreen';
import HolidaysScreen from '../screens/admin/HolidaysScreen';
import LeaveHolidaysScreen from '../screens/admin/LeaveHolidaysScreen';
import MeetingDetailScreen from '../screens/admin/MeetingDetailScreen';
import OfficesScreen from '../screens/admin/OfficesScreen';
import PfEsiScreen from '../screens/admin/PfEsiScreen';
import WorkHoursScreen from '../screens/admin/WorkHoursScreen';
import ScheduleMeetingScreen from '../screens/admin/ScheduleMeetingScreen';
import ConfigurationScreen from '../screens/admin/ConfigurationScreen';
import PayrollEmployeeScreen from '../screens/admin/PayrollEmployeeScreen';
import PayrollLockedScreen from '../screens/admin/PayrollLockedScreen';
import PayrollPrecheckScreen from '../screens/admin/PayrollPrecheckScreen';
import PayrollReviewScreen from '../screens/admin/PayrollReviewScreen';
import PayrollScreen from '../screens/admin/PayrollScreen';
import PlanBillingScreen from '../screens/admin/PlanBillingScreen';
import StaffFormScreen from '../screens/admin/StaffFormScreen';
import SalesScreen from '../screens/admin/SalesScreen';
import StaffScreen from '../screens/admin/StaffScreen';
import TodayScreen from '../screens/admin/TodayScreen';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
import { colors } from '../theme';
import { tabIcon, tabScreenOptions } from './tabOptions';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const ConfigStack = createNativeStackNavigator();

const stackOptions = { headerShown: false, contentStyle: { backgroundColor: colors.paper } };

function AdminTabs() {
  const { hasFeature } = useAuth();
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen name="Today" component={TodayScreen} options={{ tabBarIcon: tabIcon(Sun) }} />
      <Tab.Screen name="Approvals" component={ApprovalsScreen} options={{ tabBarIcon: tabIcon(ClipboardCheck) }} />
      <Tab.Screen name="Staff" component={StaffScreen} options={{ tabBarIcon: tabIcon(Users) }} />
      {/* Sales sirf tab jab company ke plan mein ho */}
      {hasFeature('sales') && <Tab.Screen name="Sales" component={SalesScreen} options={{ tabBarIcon: tabIcon(Briefcase) }} />}
      <Tab.Screen name="Payroll" component={PayrollScreen} options={{ tabBarIcon: tabIcon(IndianRupee) }} />
    </Tab.Navigator>
  );
}

// Company ki settings ki screens (Locations, Holidays, Working hours...) yahan judti hain.
function ConfigurationStack() {
  return (
    <ConfigStack.Navigator screenOptions={stackOptions}>
      <ConfigStack.Screen name="ConfigurationHome" component={ConfigurationScreen} />
      <ConfigStack.Screen name="Offices" component={OfficesScreen} />
      <ConfigStack.Screen name="WorkHours" component={WorkHoursScreen} />
      <ConfigStack.Screen name="LeaveHolidays" component={LeaveHolidaysScreen} />
      <ConfigStack.Screen name="PfEsi" component={PfEsiScreen} />
      <ConfigStack.Screen name="Holidays" component={HolidaysScreen} />
      <ConfigStack.Screen name="HolidayForm" component={HolidayFormScreen} />
    </ConfigStack.Navigator>
  );
}

// Admin: tabs + unke upar khulne wali screens (Configuration, Today ke settings button se).
export default function AdminNavigator() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen name="AdminTabs" component={AdminTabs} />
      <Stack.Screen name="Configuration" component={ConfigurationStack} />
      <Stack.Screen name="StaffForm" component={StaffFormScreen} />
      <Stack.Screen name="AppIntro" component={OnboardingScreen} initialParams={{ replay: true }} />
      <Stack.Screen name="PlanBilling" component={PlanBillingScreen} />
      <Stack.Screen name="ScheduleMeeting" component={ScheduleMeetingScreen} />
      <Stack.Screen name="MeetingDetail" component={MeetingDetailScreen} />
      <Stack.Screen name="Clients" component={ClientsScreen} />
      <Stack.Screen name="ClientForm" component={ClientFormScreen} />
      <Stack.Screen name="PayrollPrecheck" component={PayrollPrecheckScreen} />
      <Stack.Screen name="PayrollReview" component={PayrollReviewScreen} />
      <Stack.Screen name="PayrollEmployee" component={PayrollEmployeeScreen} />
      <Stack.Screen name="PayrollLocked" component={PayrollLockedScreen} />
    </Stack.Navigator>
  );
}
