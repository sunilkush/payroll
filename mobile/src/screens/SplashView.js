import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme';

const TILE = '#22262E';
const SUBTITLE = '#B9BDC7';

// Teen dot jo baari-baari chamakte hain
function LoadingDots() {
  const values = useRef([0, 1, 2].map(() => new Animated.Value(0.3))).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.stagger(
        180,
        values.map((value) =>
          Animated.sequence([
            Animated.timing(value, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.timing(value, { toValue: 0.3, duration: 300, useNativeDriver: true }),
          ])
        )
      )
    );
    loop.start();
    return () => loop.stop();
  }, [values]);
  return (
    <View style={styles.dots} accessibilityLabel="Loading">
      {values.map((opacity, index) => (
        <Animated.View key={index} style={[styles.dot, { opacity }]} />
      ))}
    </View>
  );
}

// App khulte waqt: fonts aa chuke, saved login jaancha ja raha hai (GET /auth/me). Native splash jaise hi rang.
export default function SplashView() {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <View style={[styles.circle, styles.outer]} />
      <View style={[styles.circle, styles.inner]} />
      <View style={styles.center}>
        <View style={styles.tile}>
          <View style={styles.ring} />
        </View>
        <Text style={styles.title}>Payroll</Text>
        <Text style={styles.subtitle}>Attendance · Leave · Salary</Text>
      </View>
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 40 }]}>
        <LoadingDots />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  circle: { position: 'absolute', borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  outer: { width: 520, height: 520 },
  inner: { width: 340, height: 340 },
  center: { alignItems: 'center', gap: 10 },
  tile: { width: 96, height: 96, borderRadius: 28, backgroundColor: TILE, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  ring: { width: 52, height: 52, borderRadius: 26, borderWidth: 8, borderColor: colors.successBright },
  title: { fontFamily: fonts.heading, fontSize: 40, lineHeight: 46, color: colors.onInk },
  subtitle: { fontFamily: fonts.bodyMedium, fontSize: 15, color: SUBTITLE },
  bottom: { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center' },
  dots: { flexDirection: 'row', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.onInk },
});
