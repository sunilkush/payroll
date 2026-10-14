import { StyleSheet, Switch, Text, View } from 'react-native';
import { colors, sizes, spacing, text } from '../theme';

// Setting ki ek line: naam + chhoti jaankari + switch. Card padded={false} ke andar rakho.
export default function ToggleRow({ title, subtitle, value, onValueChange, disabled = false, divider = true }) {
  return (
    <View style={[styles.row, divider && styles.divider]}>
      <View style={styles.titles}>
        <Text style={text.bodyMedium}>{title}</Text>
        {subtitle ? <Text style={text.small}>{subtitle}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: colors.track, true: colors.success }}
        thumbColor={colors.card}
        ios_backgroundColor={colors.track}
        accessibilityLabel={title}
      />
    </View>
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
});
