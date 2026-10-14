import { StyleSheet, Text, View } from 'react-native';
import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react-native';
import { colors, pillColors, radius, text } from '../theme';

const ICON = { success: CircleCheck, warning: TriangleAlert, danger: CircleAlert, info: Info };

// Rang wali patti: jaankari (success / info), chetavni (warning) ya error (danger). children khali ho to kuch nahi dikhta.
export default function Notice({ variant = 'info', children }) {
  if (!children) return null;
  const { background, text: color } = pillColors[variant] ?? pillColors.info;
  const Icon = ICON[variant] ?? Info;
  return (
    <View style={[styles.notice, { backgroundColor: background }]} accessibilityRole={variant === 'danger' ? 'alert' : undefined}>
      <Icon size={18} strokeWidth={2} color={color} style={styles.icon} />
      <Text style={[text.bodyMedium, styles.text, { color }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: { flexDirection: 'row', gap: 10, borderRadius: radius.input, paddingHorizontal: 14, paddingVertical: 12 },
  icon: { marginTop: 2 },
  text: { flex: 1, fontSize: 14, lineHeight: 20, color: colors.ink },
});
