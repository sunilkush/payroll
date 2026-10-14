import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';
import VerifyScreen from '../screens/auth/VerifyScreen';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
import { colors } from '../theme';
import { onboardingSeenNow } from '../utils/onboarding';

const Stack = createNativeStackNavigator();

// Login se pehle ki screens. Pehli baar app khule to pehle intro (Onboarding), phir Login.
// Login ho chuka ho par email verify na hua ho (khud register kiya hua account) to sirf Verify dikhta hai:
// server bhi tab tak company ka koi data nahi deta.
export default function AuthStack() {
  const { user } = useAuth();
  return (
    <Stack.Navigator
      initialRouteName={onboardingSeenNow() ? 'Login' : 'Onboarding'}
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.paper } }}
    >
      {user ? (
        <Stack.Screen name="Verify" component={VerifyScreen} />
      ) : (
        <>
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
