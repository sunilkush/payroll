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
        return { bg: colors.successBg, text: colors.success, border: '#bbf7d0' };
      case 'danger':
        return { bg: colors.dangerBg, text: colors.danger, border: '#fecaca' };
      case 'warning':
        return { bg: colors.warningBg, text: colors.warning, border: '#fde68a' };
      case 'info':
        return { bg: colors.infoBg, text: colors.info, border: '#bfdbfe' };
      case 'primary':
        return { bg: colors.primaryBg, text: colors.primary, border: '#c7d2fe' };
      case 'default':
      default:
        return { bg: colors.borderLight, text: colors.textSecondary, border: colors.border };
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
    borderRadius: borderRadius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeSm: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeMd: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  text: {
    fontWeight: typography.weights.semibold,
  },
  textSm: {
    fontSize: typography.sizes.xs,
  },
  textMd: {
    fontSize: typography.sizes.sm,
  },
});
