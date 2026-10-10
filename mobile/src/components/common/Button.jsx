import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { borderRadius, colors, typography } from '../../theme/index.js';

export default function Button({
  title,
  onPress,
  variant = 'filled', // 'filled' | 'tonal' | 'outlined' | 'text' | 'danger' | 'primary' | 'secondary' | 'outline'
  loading = false,
  disabled = false,
  icon,
  iconPlacement = 'start', // 'start' | 'end'
  style,
  textStyle,
  size = 'md', // 'sm' | 'md' | 'lg'
}) {
  const isDisabled = disabled || loading;

  const isFilled = variant === 'filled' || variant === 'primary';
  const isTonal = variant === 'tonal' || variant === 'secondary';
  const isOutlined = variant === 'outlined' || variant === 'outline';
  const isText = variant === 'text';
  const isDanger = variant === 'danger';

  const getContainerStyle = () => {
    if (isTonal) {
      return [styles.btn, styles.tonalBtn, sizeStyles[size], isDisabled && styles.disabledBtn];
    }
    if (isOutlined) {
      return [styles.btn, styles.outlinedBtn, sizeStyles[size], isDisabled && styles.disabledBtn];
    }
    if (isDanger) {
      return [styles.btn, styles.dangerBtn, sizeStyles[size], isDisabled && styles.disabledBtn];
    }
    if (isText) {
      return [styles.textBtn, sizeStyles[size], isDisabled && styles.disabledTextBtn];
    }
    // Default: Filled
    return [styles.btn, styles.filledBtn, sizeStyles[size], isDisabled && styles.disabledBtn];
  };

  const getTextColor = () => {
    if (isDisabled) return colors.textMuted;
    if (isTonal) return colors.onPrimaryContainer;
    if (isOutlined) return colors.primary;
    if (isDanger) return colors.white;
    if (isText) return colors.primary;
    return colors.onPrimary;
  };

  const textColor = getTextColor();

  return (
    <TouchableOpacity
      activeOpacity={0.75}
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
  sm: { height: 36, paddingHorizontal: 16 },
  md: { height: 44, paddingHorizontal: 20 },
  lg: { height: 50, paddingHorizontal: 24 },
};

const textSizeStyles = {
  sm: { fontSize: typography.sizes.xs },
  md: { fontSize: typography.sizes.sm },
  lg: { fontSize: typography.sizes.md },
};

const styles = StyleSheet.create({
  btn: {
    borderRadius: borderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filledBtn: {
    backgroundColor: colors.primary,
  },
  tonalBtn: {
    backgroundColor: colors.primaryContainer,
  },
  outlinedBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.outline,
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
    marginRight: 8,
  },
  endIcon: {
    marginLeft: 8,
  },
  title: {
    fontWeight: typography.weights.semibold,
    letterSpacing: 0.2,
  },
});
