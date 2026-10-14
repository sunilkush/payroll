import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius } from '../theme';

// Kadam-dar-kadam form ki patti (aam taur par 3 kadam). steps: ['Details', 'Location', 'Review'], current: 0 se.
//   dark   dark screen par (jaise QR scan): hare bar, halke labels
// Poore ho chuke kadam ke label ke aage ✓.
export default function Stepper({ steps, current = 0, dark = false }) {
  return (
    <View style={styles.row} accessibilityRole="progressbar" accessibilityLabel={`Step ${current + 1} of ${steps.length}: ${steps[current]}`}>
      {steps.map((label, index) => {
        const done = index < current;
        return (
          <View key={label} style={styles.step}>
            <View style={[styles.bar, dark && styles.barDark, index <= current && (dark ? styles.barDoneDark : styles.barDone)]} />
            <Text
              style={[styles.label, dark && styles.labelDark, index === current && (dark ? styles.labelCurrentDark : styles.labelCurrent)]}
              numberOfLines={1}
            >
              {index + 1} {label}
              {done ? ' ✓' : ''}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  step: { flex: 1, gap: 6 },
  bar: { height: 4, borderRadius: radius.pill, backgroundColor: colors.track },
  barDark: { backgroundColor: 'rgba(255,255,255,0.16)' },
  barDone: { backgroundColor: colors.ink },
  barDoneDark: { backgroundColor: colors.successBright },
  label: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.muted },
  labelDark: { color: colors.onInkMuted },
  labelCurrent: { fontFamily: fonts.bodySemiBold, color: colors.ink },
  labelCurrentDark: { fontFamily: fonts.bodySemiBold, color: colors.onInk },
});
