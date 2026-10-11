import { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, radius, spacing, typography } from '../../theme/index.js';

export default function Input({
  label,
  value,
  onChangeText,
  placeholder,
  prefixIcon,
  leftIcon,
  icon,
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
  required = false,
  ...rest
}) {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(!secureTextEntry);

  const isPassword = secureTextEntry;
  const leadingIcon = prefixIcon || leftIcon || icon;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <View style={styles.labelRow}>
          <Text style={styles.label}>{label}</Text>
          {required && <Text style={styles.requiredStar}> *</Text>}
        </View>
      )}
      <View
        style={[
          styles.inputWrapper,
          isFocused && styles.inputWrapperFocused,
          Boolean(error) && styles.inputWrapperError,
          disabled && styles.inputWrapperDisabled,
          multiline && { minHeight: numberOfLines * 24 + 24, height: 'auto', alignItems: 'flex-start' },
          style,
        ]}
      >
        {leadingIcon && (
          <MaterialCommunityIcons
            name={leadingIcon}
            size={20}
            color={error ? colors.error : isFocused ? colors.primary : colors.textSecondary}
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
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={styles.eyeBtn}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
          >
            <MaterialCommunityIcons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={colors.textSecondary}
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

export const FormInput = Input;

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  requiredStar: {
    fontSize: typography.sizes.sm,
    color: colors.error,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.input, // 10px
    paddingHorizontal: spacing.md,
    height: 48,
  },
  inputWrapperFocused: {
    borderColor: colors.primary,
    borderWidth: 1.5,
    backgroundColor: colors.surface,
  },
  inputWrapperError: {
    borderColor: colors.error,
    borderWidth: 1.5,
    backgroundColor: colors.errorContainer,
  },
  inputWrapperDisabled: {
    backgroundColor: colors.surfaceVariant,
    borderColor: colors.border,
    opacity: 0.6,
  },
  prefixIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: typography.sizes.body,
    color: colors.text,
    paddingVertical: 0,
  },
  multilineInput: {
    paddingVertical: spacing.sm,
    textAlignVertical: 'top',
  },
  eyeBtn: {
    padding: spacing.xs,
  },
  errorText: {
    fontSize: typography.sizes.caption,
    color: colors.error,
    marginTop: 4,
    fontWeight: typography.weights.medium,
  },
  helperText: {
    fontSize: typography.sizes.caption,
    color: colors.textSecondary,
    marginTop: 4,
  },
});
