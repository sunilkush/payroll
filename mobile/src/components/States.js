import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { CircleAlert, Inbox } from 'lucide-react-native';
import { colors, radius, spacing, text } from '../theme';
import { SecondaryButton } from './Buttons';

// Teen haalat jo har list / screen mein aati hain: khali, error, aur load hote waqt.

// Abhi kuch nahi hai (error nahi). action: { title, onPress }
export function EmptyState({ icon: Icon = Inbox, title, message, action }) {
  return (
    <View style={styles.state}>
      <View style={styles.icon}>
        <Icon size={24} strokeWidth={1.8} color={colors.muted} />
      </View>
      <Text style={[text.bodySemiBold, styles.center]}>{title}</Text>
      {message ? <Text style={[text.small, styles.center]}>{message}</Text> : null}
      {action && <SecondaryButton title={action.title} onPress={action.onPress} style={styles.action} />}
    </View>
  );
}

// Data nahi aa saka. message: api client ka error.message. onRetry do to "Try again" dikhta hai.
export function ErrorState({ message, onRetry }) {
  return (
    <View style={styles.state} accessibilityRole="alert">
      <View style={[styles.icon, styles.dangerIcon]}>
        <CircleAlert size={24} strokeWidth={1.8} color={colors.danger} />
      </View>
      <Text style={[text.bodySemiBold, styles.center]}>Something went wrong</Text>
      <Text style={[text.small, styles.center]}>{message || 'Please try again.'}</Text>
      {onRetry && <SecondaryButton title="Try again" onPress={onRetry} style={styles.action} />}
    </View>
  );
}

// Load hote waqt content ki jagah dhadakta hua grey dabba. height / width / radius apne content jaisa do.
export function Skeleton({ height = 16, width = '100%', borderRadius = radius.input, style }) {
  const opacity = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return <Animated.View style={[{ height, width, borderRadius, backgroundColor: colors.track, opacity }, style]} />;
}

// Card jaisi list ka skeleton: rows ki ginti do.
export function SkeletonList({ rows = 3 }) {
  return (
    <View style={styles.list} accessibilityLabel="Loading">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} height={64} borderRadius={radius.card} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  state: { alignItems: 'center', gap: 8, paddingVertical: 32, paddingHorizontal: spacing.screen },
  icon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.neutralTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  dangerIcon: { backgroundColor: colors.dangerTint },
  center: { textAlign: 'center' },
  action: { alignSelf: 'stretch', marginTop: 8 },
  list: { gap: spacing.gap },
});
