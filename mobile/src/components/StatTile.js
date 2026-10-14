import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, text } from '../theme';

// Ek ginti + uska chhota naam (jaise "12" / "Present"). Ek row mein kai tiles: har ek flex: 1 leta hai.
//   dark   DarkCard ke andar ho to
//   tone   ginti ka rang: success | warning | danger | info
export default function StatTile({ value, label, dark = false, tone }) {
  const toneColor = tone ? (dark && tone === 'success' ? colors.successBright : colors[tone]) : undefined;
  return (
    <View style={[styles.tile, dark && styles.dark]}>
      <Text style={[text.monoLarge, dark && styles.onDark, toneColor && { color: toneColor }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={[text.small, dark && styles.onDarkMuted]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.gap,
    gap: 2,
  },
  dark: { backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'transparent' },
  onDark: { color: colors.onInk },
  onDarkMuted: { color: colors.onInkMuted },
});
