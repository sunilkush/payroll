import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import { colors, fonts, radius, sizes } from '../theme';

// −  1.25  +  : chhoti ginti badalne ke liye (leave credit, minute). format: dikhane ka tareeka.
export default function NumberStepper({ value, onChange, step = 1, min = 0, max = Infinity, format = String, label, disabled = false }) {
  const round = (next) => Math.round(next * 100) / 100;
  const change = (by) => onChange(Math.min(max, Math.max(min, round(value + by))));
  return (
    <View style={styles.row} accessibilityLabel={label}>
      <Pressable
        style={[styles.button, (disabled || value <= min) && styles.disabled]}
        onPress={() => change(-step)}
        disabled={disabled || value <= min}
        accessibilityRole="button"
        accessibilityLabel={`Decrease ${label ?? ''}`}
      >
        <Minus size={18} strokeWidth={2} color={colors.ink} />
      </Pressable>
      <Text style={styles.value} accessibilityLiveRegion="polite">
        {format(value)}
      </Text>
      <Pressable
        style={[styles.button, (disabled || value >= max) && styles.disabled]}
        onPress={() => change(step)}
        disabled={disabled || value >= max}
        accessibilityRole="button"
        accessibilityLabel={`Increase ${label ?? ''}`}
      >
        <Plus size={18} strokeWidth={2} color={colors.ink} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  button: {
    width: sizes.touch,
    height: sizes.touch,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.4 },
  value: { minWidth: 64, textAlign: 'center', fontFamily: fonts.monoSemiBold, fontSize: 16, color: colors.ink },
});
