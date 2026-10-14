import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius, sizes } from '../theme';

// Grey patti par safed "thumb". options: [{ value, label }]
export default function SegmentedControl({ options, value, onChange }) {
  return (
    <View style={styles.track} accessibilityRole="tablist">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            style={[styles.segment, selected && styles.thumb]}
            onPress={() => onChange(option.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
          >
            <Text style={[styles.label, selected && styles.selectedLabel]} numberOfLines={1}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', backgroundColor: colors.track, borderRadius: radius.input, padding: 4, gap: 4 },
  segment: { flex: 1, minHeight: sizes.touch - 4, borderRadius: radius.input - 3, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  thumb: { backgroundColor: colors.card },
  label: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.muted },
  selectedLabel: { fontFamily: fonts.bodySemiBold, color: colors.ink },
});
