import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius } from '../theme';

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

// Chhota date ka dabba: upar mahina (MON), neeche din. tone: neutral | warning (amber) | ink
export default function DateTile({ date, tone = 'neutral', size = 48 }) {
  const [, month, day] = date.split('-').map(Number);
  const palette = {
    neutral: [colors.neutralTint, colors.muted, colors.ink],
    warning: [colors.warningTint, colors.warning, colors.warning],
    ink: [colors.ink, colors.onInkMuted, colors.onInk],
  }[tone];
  return (
    <View style={[styles.tile, { width: size, height: size, backgroundColor: palette[0] }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Text style={[styles.month, { color: palette[1] }]}>{MONTHS[month - 1]}</Text>
      <Text style={[styles.day, { color: palette[2], fontSize: size * 0.38 }]}>{day}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { borderRadius: radius.input, alignItems: 'center', justifyContent: 'center' },
  month: { fontFamily: fonts.bodySemiBold, fontSize: 10, letterSpacing: 0.5 },
  day: { fontFamily: fonts.monoSemiBold, lineHeight: 22 },
});
