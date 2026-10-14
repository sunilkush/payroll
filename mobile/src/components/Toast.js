import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { CircleCheck } from 'lucide-react-native';
import { colors, radius, spacing, text } from '../theme';

// Upar se aane wala chhota message jo khud chala jata hai ("Saved", "Password updated").
// Screen ke overlay prop mein rakho: <Screen overlay={<Toast message={toast} onHide={() => setToast('')} />}>
export default function Toast({ message, onHide, duration = 4000 }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!message) return undefined;
    Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    const timer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => onHide?.());
    }, duration);
    return () => clearTimeout(timer);
  }, [message, duration, opacity, onHide]);

  if (!message) return null;
  return (
    <Animated.View style={[styles.toast, { opacity }]} accessibilityRole="alert" accessibilityLiveRegion="polite" pointerEvents="none">
      <CircleCheck size={18} strokeWidth={2} color={colors.successBright} />
      <Text style={[text.bodyMedium, styles.text]}>{message}</Text>
    </Animated.View>
  );
}

// Screen ka apna toast: const [toast, showToast, hideToast] = useToast(). hideToast stable rehta hai (timer reset na ho).
export function useToast() {
  const [message, setMessage] = useState('');
  const hide = useCallback(() => setMessage(''), []);
  return [message, setMessage, hide];
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    top: spacing.gap,
    left: spacing.screen,
    right: spacing.screen,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.ink,
    borderRadius: radius.button,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  text: { flex: 1, color: colors.onInk, fontSize: 14, lineHeight: 20 },
});
