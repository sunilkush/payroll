import { StyleSheet, Text, View } from 'react-native';
import { borderRadius, colors, typography } from '../../theme/index.js';

export default function Badge({
  label,
  variant = 'default', // 'success' | 'danger' | 'warning' | 'info' | 'primary' | 'default'
  size = 'md', // 'sm' | 'md'
  style,
  textStyle,
}) {
  const getColors = () => {
    switch (variant) {
      case 'success':
        return {
          bg: colors.successContainer,
          text: colors.onSuccessContainer,
          border: '#bbf7d0',
        };
      case 'danger':
      case 'error':
        return {
          bg: colors.errorContainer,
          text: colors.onErrorContainer,
          border: '#fecaca',
        };
      case 'warning':
        return {
          bg: colors.warningContainer,
          text: colors.onWarningContainer,
          border: '#fde68a',
        };
      case 'info':
        return {
          bg: colors.infoContainer,
          text: '#0369a1',
          border: '#bae6fd',
        };
      case 'primary':
        return {
          bg: colors.primaryContainer,
          text: colors.onPrimaryContainer,
          border: '#bfdbfe',
        };
      case 'default':
      default:
        return {
          bg: colors.surfaceVariant,
          text: colors.onSurfaceVariant,
          border: colors.outlineVariant,
        };
    }
  };

  const scheme = getColors();

  return (
    <View
      style={[
        styles.badge,
        size === 'sm' ? styles.badgeSm : styles.badgeMd,
        { backgroundColor: scheme.bg, borderColor: scheme.border },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          size === 'sm' ? styles.textSm : styles.textMd,
          { color: scheme.text },
          textStyle,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeSm: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
  },
  badgeMd: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  text: {
    fontWeight: typography.weights.semibold,
    letterSpacing: 0.1,
  },
  textSm: {
    fontSize: typography.sizes.xs,
  },
  textMd: {
    fontSize: typography.sizes.sm,
  },
});
