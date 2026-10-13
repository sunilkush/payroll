import { ActivityIndicator, View } from 'react-native';
import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppGate from '../components/AppGate.js';
import { AuthProvider, useAuth } from '../context/AuthContext.js';
import { colors } from '../theme.js';
import { onNotificationTap } from '../utils/notifications.js';

function RootStack() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Notification par tap: us request wali screen khulti hai (login ho tabhi).
  const role = user?.role;
  useEffect(() => {
    if (!role) return undefined;
    return onNotificationTap(role, (path) => router.navigate(path));
  }, [role, router]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  // Login na ho to sirf login screen khulti hai; login ke baad sirf andar ki screens.
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!user}>
        <Stack.Screen name="login" />
      </Stack.Protected>
      <Stack.Protected guard={Boolean(user)}>
        <Stack.Screen name="index" />
        <Stack.Screen name="staff" />
        <Stack.Screen name="admin" />
        <Stack.Screen name="superadmin" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <AppGate>
          <RootStack />
        </AppGate>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
