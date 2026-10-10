import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { borderRadius, colors, typography } from '../../theme/index.js';

export default function Button({
  title,
  onPress,
  variant = 'primary', // 'primary' | 'secondary' | 'outline' | 'danger' | 'text'
  loading = false,
  disabled = false,
  icon,
  iconPlacement = 'start', // 'start' | 'end'
  style,
  textStyle,
  size = 'md', // 'sm' | 'md' | 'lg'
}) {
  const isDisabled = disabled || loading;

  const getContainerStyle = () => {
    switch (variant) {
      case 'secondary':
        return [styles.btn, styles.secondaryBtn, sizeStyles[size], isDisabled && styles.disabledBtn];
      case 'outline':
        return [styles.btn, styles.outlineBtn, sizeStyles[size], isDisabled && styles.disabledBtn];
      case 'danger':
        return [styles.btn, styles.dangerBtn, sizeStyles[size], isDisabled && styles.disabledBtn];
      case 'text':
        return [styles.textBtn, sizeStyles[size], isDisabled && styles.disabledTextBtn];
      case 'primary':
      default:
        return [styles.btn, styles.primaryBtn, sizeStyles[size], isDisabled && styles.disabledBtn];
    }
  };

  const getTextColor = () => {
    if (isDisabled) return colors.textMuted;
    switch (variant) {
      case 'secondary':
        return colors.text;
      case 'outline':
        return colors.primary;
      case 'danger':
        return colors.white;
      case 'text':
        return colors.primary;
      case 'primary':
      default:
        return colors.white;
    }
  };

  const textColor = getTextColor();

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={isDisabled}
      style={[getContainerStyle(), style]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <View style={styles.contentRow}>
          {icon && iconPlacement === 'start' && (
            <MaterialCommunityIcons name={icon} size={18} color={textColor} style={styles.startIcon} />
          )}
          <Text style={[styles.title, { color: textColor }, textSizeStyles[size], textStyle]}>
            {title}
          </Text>
          {icon && iconPlacement === 'end' && (
            <MaterialCommunityIcons name={icon} size={18} color={textColor} style={styles.endIcon} />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const sizeStyles = {
  sm: { height: 36, paddingHorizontal: 12 },
  md: { height: 48, paddingHorizontal: 16 },
  lg: { height: 54, paddingHorizontal: 20 },
};

const textSizeStyles = {
  sm: { fontSize: typography.sizes.sm },
  md: { fontSize: typography.sizes.md },
  lg: { fontSize: typography.sizes.lg },
};

const styles = StyleSheet.create({
  btn: {
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtn: {
    backgroundColor: colors.primary,
  },
  secondaryBtn: {
    backgroundColor: colors.borderLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  outlineBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  dangerBtn: {
    backgroundColor: colors.danger,
  },
  textBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  disabledBtn: {
    opacity: 0.6,
  },
  disabledTextBtn: {
    opacity: 0.5,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  startIcon: {
    marginRight: 8,
  },
  endIcon: {
    marginLeft: 8,
  },
  title: {
    fontWeight: typography.weights.semibold,
  },
});
