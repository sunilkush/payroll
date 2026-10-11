import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, radius, spacing, typography } from '../../theme/index.js';

export default function Button({
  title,
  onPress,
  variant = 'primary', // 'primary' | 'secondary' | 'tonal' | 'outlined' | 'outline' | 'filled' | 'danger' | 'ghost' | 'text'
  loading = false,
  disabled = false,
  icon,
  iconPlacement = 'start', // 'start' | 'end'
  style,
  textStyle,
  size = 'md', // 'sm' | 'md' | 'lg'
  fullWidth = true,
  ...rest
}) {
  const isDisabled = disabled || loading;

  const isPrimary = variant === 'primary' || variant === 'filled';
  const isSecondary = variant === 'secondary' || variant === 'tonal';
  const isOutlined = variant === 'outlined' || variant === 'outline';
  const isDanger = variant === 'danger';
  const isGhost = variant === 'ghost' || variant === 'text';

  const getContainerStyle = () => {
    if (isSecondary) {
      return [styles.btn, styles.secondaryBtn, sizeStyles[size], isDisabled && styles.disabledBtn];
    }
    if (isOutlined) {
      return [styles.btn, styles.outlinedBtn, sizeStyles[size], isDisabled && styles.disabledBtn];
    }
    if (isDanger) {
      return [styles.btn, styles.dangerBtn, sizeStyles[size], isDisabled && styles.disabledBtn];
    }
    if (isGhost) {
      return [styles.btn, styles.ghostBtn, sizeStyles[size], isDisabled && styles.disabledTextBtn];
    }
    // Default: Primary
    return [styles.btn, styles.primaryBtn, sizeStyles[size], isDisabled && styles.disabledBtn];
  };

  const getTextColor = () => {
    if (isDisabled) return colors.textMuted;
    if (isSecondary) return colors.primaryDark;
    if (isOutlined) return colors.primary;
    if (isDanger) return colors.white;
    if (isGhost) return colors.primary;
    return colors.white;
  };

  const textColor = getTextColor();

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={isDisabled}
      style={[
        getContainerStyle(),
        !fullWidth && { alignSelf: 'flex-start' },
        style,
      ]}
      accessibilityRole="button"
      {...rest}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <View style={styles.contentRow}>
          {icon && iconPlacement === 'start' && (
            <MaterialCommunityIcons
              name={icon}
              size={size === 'sm' ? 16 : 18}
              color={textColor}
              style={styles.startIcon}
            />
          )}
          {title ? (
            <Text style={[styles.title, { color: textColor }, textSizeStyles[size], textStyle]}>
              {title}
            </Text>
          ) : null}
          {icon && iconPlacement === 'end' && (
            <MaterialCommunityIcons
              name={icon}
              size={size === 'sm' ? 16 : 18}
              color={textColor}
              style={styles.endIcon}
            />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

export function PrimaryButton(props) {
  return <Button variant="primary" {...props} />;
}

export function SecondaryButton(props) {
  return <Button variant="secondary" {...props} />;
}

export function IconButton({ icon, onPress, size = 40, color = colors.primary, style, disabled = false, bg = colors.surfaceVariant, ...rest }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      style={[
        {
          width: size,
          height: size,
          borderRadius: radius.control,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: bg,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
      accessibilityRole="button"
      {...rest}
    >
      <MaterialCommunityIcons name={icon} size={Math.round(size * 0.55)} color={color} />
    </TouchableOpacity>
  );
}

const sizeStyles = {
  sm: { height: 36, paddingHorizontal: spacing.md, borderRadius: radius.control },
  md: { height: 48, paddingHorizontal: spacing.lg, borderRadius: radius.button },
  lg: { height: 52, paddingHorizontal: spacing.xl, borderRadius: radius.button },
};

const textSizeStyles = {
  sm: { fontSize: typography.sizes.caption, fontWeight: typography.weights.semibold },
  md: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold },
  lg: { fontSize: typography.sizes.md, fontWeight: typography.weights.bold },
};

const styles = StyleSheet.create({
  btn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtn: {
    backgroundColor: colors.primary,
  },
  secondaryBtn: {
    backgroundColor: colors.primaryLight,
  },
  outlinedBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  dangerBtn: {
    backgroundColor: colors.error,
  },
  ghostBtn: {
    backgroundColor: 'transparent',
  },
  disabledBtn: {
    opacity: 0.5,
  },
  disabledTextBtn: {
    opacity: 0.4,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  startIcon: {
    marginRight: spacing.sm,
  },
  endIcon: {
    marginLeft: spacing.sm,
  },
  title: {
    letterSpacing: 0.1,
  },
});
