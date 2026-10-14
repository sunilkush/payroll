import { StyleSheet, View } from 'react-native';
import { colors, radius } from '../theme';

// value: 0 se 1. tone: ink (default) | success | warning | danger | info
export default function ProgressBar({ value = 0, tone = 'ink', accessibilityLabel }) {
  const percent = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <View
      style={styles.track}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: percent }}
    >
      <View style={[styles.fill, { width: `${percent}%`, backgroundColor: colors[tone] ?? colors.ink }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 8, borderRadius: radius.pill, backgroundColor: colors.track, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill },
});
