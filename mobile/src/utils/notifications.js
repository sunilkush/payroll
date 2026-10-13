import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { getDeviceId } from '../api/client.js';
import { savePushTokenApi } from '../api/endpoints.js';

// Expo Go mein push notifications nahi chalti (Android par expo-notifications ko import karte hi error aata hai),
// isliye wahan ye library load hi nahi karte: app baaki sab kaam karta hai, bas notifications nahi aati.
// Asli app / development build mein sab chalta hai.
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
const Notifications = isExpoGo ? null : require('expo-notifications');

// App khula ho tab bhi notification upar dikhe.
Notifications?.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const isAllowed = (status) =>
  status.granted ||
  status.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED ||
  status.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;

// Login ke baad: permission maangta hai aur is phone ka push token server ko deta hai.
// Kuch bhi na ho paye (permission nahi, Expo Go, network) to chup rehta hai: app baaki sab kaam karta hai.
export async function registerForPush() {
  if (!Notifications) return;
  try {
    // Android 13+: permission ka sawal channel banne ke baad hi aata hai.
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'General',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }

    let allowed = isAllowed(await Notifications.getPermissionsAsync());
    if (!allowed) allowed = isAllowed(await Notifications.requestPermissionsAsync());
    if (!allowed) return;

    // EAS project id (`npx eas-cli init` se app.json mein aata hai). Iske bina push token nahi banta.
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return;

    const { data: pushToken } = await Notifications.getExpoPushTokenAsync({ projectId });
    await savePushTokenApi({ deviceId: await getDeviceId(), pushToken });
  } catch (error) {
    console.warn('Push notifications are not set up:', error?.message ?? error);
  }
}

// Notification par tap: server ke bheje `data.screen` ke hisaab se role ki sahi screen.
const SCREEN_PATH = {
  STAFF: { leaves: '/staff/leaves', attendance: '/staff/attendance' },
  ADMIN: { leaves: '/admin/leaves', corrections: '/admin/corrections' },
};

// Notification par tap hone par onPath(path) chalta hai (path: us role ki screen). Return: band karne wala function.
export function onNotificationTap(role, onPath) {
  if (!Notifications) return () => {};
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const path = SCREEN_PATH[role]?.[response.notification.request.content.data?.screen];
    if (path) onPath(path);
  });
  return () => subscription.remove();
}
