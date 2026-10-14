import { StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '../theme';

// Safed card. hero: badi golai (20) wala. padded={false}: andar ListRow ho jo apni padding khud leta hai.
export default function Card({ children, hero = false, padded = true, style }) {
  return <View style={[styles.card, hero && styles.hero, padded && styles.padded, style]}>{children}</View>;
}

// Ink (kaala) card: aaj ka punch, net salary jaise sabse zaroori hisse ke liye. Andar ka text colors.onInk mein.
export function DarkCard({ children, hero = true, style }) {
  return <View style={[styles.card, styles.dark, hero && styles.hero, styles.padded, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  dark: { backgroundColor: colors.ink, borderColor: colors.ink },
  hero: { borderRadius: radius.hero },
  padded: { padding: spacing.gapLg, gap: spacing.gap },
});
