import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { colors, sizes, spacing, text } from '../theme';

// List ki ek line: (left) title + subtitle ... right value / pill + chevron. Card padded={false} ke andar rakho.
//   left     baayein ka hissa (icon / avatar)
//   value    daayein ka text; mono: true ho to mono font (time, paise, ginti)
//   right    daayein ka apna hissa (jaise Pill); value ki jagah
//   onPress  do to row dabti hai aur chevron dikhta hai
//   divider  neeche ki line (aakhri row par false)
//   subtitleTone  subtitle ka rang: warning | danger | success (jaise LOP amber mein)
export default function ListRow({ title, subtitle, subtitleTone, left, value, mono = true, right, onPress, divider = true }) {
  const body = (
    <View style={[styles.row, divider && styles.divider]}>
      {left}
      <View style={styles.titles}>
        <Text style={text.bodyMedium} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[text.small, subtitleTone && { color: colors[subtitleTone] }]} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ?? (value != null ? <Text style={mono ? text.mono : text.body}>{value}</Text> : null)}
      {onPress && <ChevronRight size={18} strokeWidth={2} color={colors.muted} />}
    </View>
  );

  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => pressed && styles.pressed}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: sizes.touch + 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.gap,
    paddingHorizontal: spacing.gapLg,
    paddingVertical: 10,
  },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  titles: { flex: 1, gap: 2 },
  pressed: { backgroundColor: colors.paper },
});
