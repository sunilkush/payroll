import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, pillColors, sizes } from '../theme';

export const initialsOf = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');

// Naam ke initials ka gola. tone: success | warning | danger | info | neutral (status ke hisaab se rang), ya ink.
export default function Avatar({ name, tone = 'neutral', size = sizes.touch }) {
  const palette = tone === 'ink' ? { background: colors.ink, text: colors.onInk } : pillColors[tone] ?? pillColors.neutral;
  return (
    <View
      style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: palette.background }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Text style={[styles.text, { color: palette.text, fontSize: size * 0.34 }]}>{initialsOf(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
  text: { fontFamily: fonts.bodySemiBold },
});
