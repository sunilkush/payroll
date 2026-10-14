import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { colors, fonts, radius, sizes, text } from '../theme';

// Label (13px, 600) + input + error / hint. Baaki props seedhe TextInput par jaate hain.
//   error      field ke neeche laal message (api client ke { field: message } se)
//   secure     password: aankh wale button se dikhta / chhupta hai
//   multiline  kai line ka text
//   mono       ginti / code wale fields (OTP, amount)
export default function FormField({ label, error, hint, secure = false, multiline = false, mono = false, style, ...inputProps }) {
  const [hidden, setHidden] = useState(secure);
  const [focused, setFocused] = useState(false);
  const Icon = hidden ? Eye : EyeOff;

  return (
    <View style={styles.field}>
      {label ? <Text style={text.label}>{label}</Text> : null}
      <View style={[styles.box, multiline && styles.boxMultiline, focused && styles.focused, error && styles.invalid]}>
        <TextInput
          style={[styles.input, mono && styles.mono, multiline && styles.inputMultiline, style]}
          placeholderTextColor={colors.muted}
          secureTextEntry={hidden}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          accessibilityLabel={label}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...inputProps}
        />
        {secure && (
          <Pressable
            style={styles.eye}
            onPress={() => setHidden((previous) => !previous)}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
          >
            <Icon size={20} strokeWidth={1.8} color={colors.muted} />
          </Pressable>
        )}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={text.small}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  box: {
    minHeight: sizes.input,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radius.input,
  },
  boxMultiline: { alignItems: 'flex-start' },
  focused: { borderColor: colors.ink },
  invalid: { borderColor: colors.danger },
  input: { flex: 1, minHeight: sizes.input, paddingHorizontal: 14, fontFamily: fonts.body, fontSize: 15, color: colors.ink },
  inputMultiline: { minHeight: 96, paddingVertical: 12 },
  mono: { fontFamily: fonts.mono },
  eye: { width: sizes.touch, height: sizes.touch, alignItems: 'center', justifyContent: 'center' },
  error: { fontFamily: fonts.body, fontSize: 13, color: colors.danger },
});
