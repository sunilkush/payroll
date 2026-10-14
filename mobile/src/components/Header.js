import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { colors, sizes, spacing, text } from '../theme';

// Screen ke upar: (optional) gol safed back button + title + subtitle + daayein ka slot.
//   onBack   do to back button dikhta hai
//   right    daayein ka hissa (jaise settings ka button)
export default function Header({ title, subtitle, onBack, right }) {
  return (
    <View style={styles.row}>
      {onBack && (
        <Pressable style={styles.back} onPress={onBack} accessibilityRole="button" accessibilityLabel="Go back" hitSlop={4}>
          <ArrowLeft size={20} strokeWidth={2} color={colors.ink} />
        </Pressable>
      )}
      <View style={styles.titles}>
        <Text style={text.screenTitle} accessibilityRole="header" numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? <Text style={text.small}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

// Header ke daayein (ya kahin bhi) gol safed icon button. accessibilityLabel zaroori hai.
export function IconButton({ icon: Icon, onPress, accessibilityLabel }) {
  return (
    <Pressable style={styles.back} onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel} hitSlop={4}>
      <Icon size={20} strokeWidth={2} color={colors.ink} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.gap },
  back: {
    width: sizes.touch,
    height: sizes.touch,
    borderRadius: sizes.touch / 2,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titles: { flex: 1, gap: 2 },
});
