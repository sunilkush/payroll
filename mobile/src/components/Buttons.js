import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors, fonts, radius, sizes } from '../theme';

// Screen ka mukhya kaam: ink (kaala) button, 56 ooncha.
//   loading   true ho to spinner dikhta hai aur dobara nahi dabta
//   icon      lucide icon (text se pehle)
export function PrimaryButton({ title, onPress, loading = false, disabled = false, icon: Icon, style }) {
  const blocked = disabled || loading;
  return (
    <Pressable
      style={({ pressed }) => [styles.button, styles.primary, blocked && styles.disabled, pressed && styles.pressed, style]}
      onPress={onPress}
      disabled={blocked}
      accessibilityRole="button"
      accessibilityState={{ disabled: blocked, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator color={colors.onInk} />
      ) : (
        <>
          {Icon && <Icon size={20} strokeWidth={2} color={colors.onInk} />}
          <Text style={[styles.label, styles.primaryLabel]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

// Doosra kaam: safed button, border ke saath. danger: laal text (jaise Reject, Log out).
export function SecondaryButton({ title, onPress, loading = false, disabled = false, danger = false, icon: Icon, style }) {
  const blocked = disabled || loading;
  const color = danger ? colors.danger : colors.ink;
  return (
    <Pressable
      style={({ pressed }) => [styles.button, styles.secondary, blocked && styles.disabled, pressed && styles.pressed, style]}
      onPress={onPress}
      disabled={blocked}
      accessibilityRole="button"
      accessibilityState={{ disabled: blocked, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <>
          {Icon && <Icon size={20} strokeWidth={2} color={color} />}
          <Text style={[styles.label, { color }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: sizes.button,
    borderRadius: radius.button,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
  },
  primary: { backgroundColor: colors.ink },
  secondary: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.inputBorder },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.85 },
  label: { fontFamily: fonts.bodySemiBold, fontSize: 16 },
  primaryLabel: { color: colors.onInk },
});
