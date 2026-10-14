import { colors, fonts } from '../theme';

// Staff aur Admin dono ke bottom tabs ka ek hi roop. Header har screen apna (components/Header) lagati hai.
export const tabScreenOptions = {
  headerShown: false,
  tabBarActiveTintColor: colors.ink,
  tabBarInactiveTintColor: colors.muted,
  tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.line, borderTopWidth: 1,paddingBottom: 10, height:60  },
  tabBarLabelStyle: { fontFamily: fonts.bodyMedium, fontSize: 11 },
  tabBarHideOnKeyboard: true,
};

// Tab ka icon: chuna hua thoda mota.
export const tabIcon = (Icon) =>
  function TabIcon({ color, focused }) {
    return <Icon size={22} strokeWidth={focused ? 2 : 1.8} color={color} />;
  };
