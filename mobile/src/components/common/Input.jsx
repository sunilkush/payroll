import { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { borderRadius, colors, typography } from '../../theme/index.js';

export default function Input({
  label,
  value,
  onChangeText,
  placeholder,
  prefixIcon,
  secureTextEntry = false,
  error,
  helper,
  keyboardType = 'default',
  autoCapitalize = 'none',
  autoCorrect = false,
  disabled = false,
  multiline = false,
  numberOfLines = 1,
  style,
  containerStyle,
  onBlur,
  onFocus,
  ...rest
}) {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(!secureTextEntry);

  const isPassword = secureTextEntry;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.inputWrapper,
          isFocused && styles.inputWrapperFocused,
          Boolean(error) && styles.inputWrapperError,
          disabled && styles.inputWrapperDisabled,
          multiline && { height: numberOfLines * 24 + 24, alignItems: 'flex-start' },
          style,
        ]}
      >
        {prefixIcon && (
          <MaterialCommunityIcons
            name={prefixIcon}
            size={20}
            color={error ? colors.danger : isFocused ? colors.primary : colors.textMuted}
            style={styles.prefixIcon}
          />
        )}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={isPassword && !showPassword}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          editable={!disabled}
          multiline={multiline}
          numberOfLines={numberOfLines}
          style={[styles.input, multiline && styles.multilineInput]}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />
        {isPassword && (
          <TouchableOpacity
            onPress={() => setShowPassword((prev) => !prev)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.eyeBtn}
          >
            <MaterialCommunityIcons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={colors.textMuted}
            />
          </TouchableOpacity>
        )}
      </View>
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : helper ? (
        <Text style={styles.helperText}>{helper}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 14,
    height: 50,
  },
  inputWrapperFocused: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: colors.white,
  },
  inputWrapperError: {
    borderColor: colors.error,
    borderWidth: 2,
    backgroundColor: colors.errorContainer,
  },
  inputWrapperDisabled: {
    backgroundColor: colors.surfaceVariant,
    borderColor: colors.outlineVariant,
    opacity: 0.6,
  },
  prefixIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: typography.sizes.md,
    color: colors.text,
    paddingVertical: 0,
  },
  multilineInput: {
    paddingVertical: 10,
    textAlignVertical: 'top',
  },
  eyeBtn: {
    padding: 4,
  },
  errorText: {
    fontSize: typography.sizes.xs,
    color: colors.danger,
    marginTop: 4,
  },
  helperText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 4,
  },
});
