import { useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { colors, fonts, radius } from '../theme';

// Code ke alag-alag dabbe (mono ank). value: ab tak ka code (string), onChange(code).
//   - ank likhte hi agla dabba; khali dabbe mein backspace pichhle par le jata hai
//   - poora code paste karo (ya SMS / email se auto-fill) to saare dabbe bhar jate hain
//   - jis dabbe mein cursor hai uska border hara; error ho to sab laal
export default function OtpInput({ value, onChange, length = 6, error = false, onComplete, disabled = false }) {
  const inputs = useRef([]);
  const [active, setActive] = useState(-1);
  const digits = Array.from({ length }, (_, index) => value[index] ?? '');

  const focus = (index) => inputs.current[Math.max(0, Math.min(length - 1, index))]?.focus();

  const commit = (code) => {
    onChange(code);
    if (code.length === length) onComplete?.(code);
  };

  const handleChange = (index, typed) => {
    const clean = typed.replace(/\D/g, '');
    if (clean.length > 1) {
      // Paste / auto-fill: is dabbe se aage bharte hain (poora code ho to shuru se).
      const start = clean.length >= length ? 0 : index;
      const next = (value.slice(0, start) + clean).slice(0, length);
      commit(next);
      focus(next.length);
      return;
    }
    if (!clean) {
      onChange(value.slice(0, index));
      return;
    }
    // Beech ka dabba badla ho to wahi ank badalta hai; aage ke bane rehte hain.
    const next = (value.slice(0, index) + clean + value.slice(index + 1)).slice(0, length);
    commit(next);
    focus(index + 1);
  };

  const handleKeyPress = (index, key) => {
    if (key !== 'Backspace' || digits[index] || index === 0) return;
    onChange(value.slice(0, index - 1));
    focus(index - 1);
  };

  return (
    <View style={styles.row}>
      {digits.map((digit, index) => (
        <TextInput
          key={index}
          ref={(node) => {
            inputs.current[index] = node;
          }}
          style={[styles.box, active === index && styles.active, error && styles.invalid]}
          value={digit}
          onChangeText={(typed) => handleChange(index, typed)}
          onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
          onFocus={() => setActive(index)}
          onBlur={() => setActive((previous) => (previous === index ? -1 : previous))}
          keyboardType="number-pad"
          inputMode="numeric"
          // 1 nahi: paste / auto-fill ka poora code isi dabbe mein aata hai, phir bant jata hai
          maxLength={length}
          selectTextOnFocus
          editable={!disabled}
          autoFocus={index === 0}
          textContentType={index === 0 ? 'oneTimeCode' : 'none'}
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          accessibilityLabel={`Digit ${index + 1} of ${length}`}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  box: {
    flex: 1,
    height: 56,
    borderWidth: 1.5,
    borderColor: colors.inputBorder,
    borderRadius: radius.input,
    backgroundColor: colors.card,
    textAlign: 'center',
    fontFamily: fonts.monoSemiBold,
    fontSize: 22,
    color: colors.ink,
    padding: 0,
  },
  active: { borderColor: colors.success },
  invalid: { borderColor: colors.danger },
});
