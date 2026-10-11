import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../../theme/index.js';

export default function Badge({
  label,
  variant, // 'success' | 'danger' | 'warning' | 'info' | 'primary' | 'default'
  status,  // Helper string: 'Present' | 'Half Day' | 'Absent' | 'Pending' | 'Paid' etc.
  size = 'md', // 'sm' | 'md'
  style,
  textStyle,
}) {
  const resolveVariant = () => {
    if (variant) return variant;
    if (!status && !label) return 'default';
    const textToCheck = String(status || label).toLowerCase();

    if (
      textToCheck.includes('present') ||
      textToCheck.includes('approved') ||
      textToCheck.includes('paid') ||
      textToCheck.includes('active') ||
      textToCheck.includes('completed') ||
      textToCheck.includes('ontime')
    ) {
      return 'success';
    }
    if (
      textToCheck.includes('half') ||
      textToCheck.includes('pending') ||
      textToCheck.includes('review') ||
      textToCheck.includes('late') ||
      textToCheck.includes('warning')
    ) {
      return 'warning';
    }
    if (
      textToCheck.includes('absent') ||
      textToCheck.includes('rejected') ||
      textToCheck.includes('failed') ||
      textToCheck.includes('unpaid') ||
      textToCheck.includes('overdue') ||
      textToCheck.includes('cancelled')
    ) {
      return 'danger';
    }
    if (
      textToCheck.includes('leave') ||
      textToCheck.includes('holiday') ||
      textToCheck.includes('weekoff') ||
      textToCheck.includes('info')
    ) {
      return 'info';
    }
    return 'default';
  };

  const currentVariant = resolveVariant();

  const getColors = () => {
    switch (currentVariant) {
      case 'success':
        return {
          bg: colors.successContainer,
          text: colors.success,
          border: '#BBF7D0',
        };
      case 'danger':
      case 'error':
        return {
          bg: colors.errorContainer,
          text: colors.error,
          border: '#FECACA',
        };
      case 'warning':
        return {
          bg: colors.warningContainer,
          text: colors.warning,
          border: '#FDE68A',
        };
      case 'info':
        return {
          bg: colors.infoContainer,
          text: colors.info,
          border: '#BAE6FD',
        };
      case 'primary':
        return {
          bg: colors.primaryContainer,
          text: colors.primaryDark,
          border: '#BFDBFE',
        };
      case 'default':
      default:
        return {
          bg: colors.surfaceVariant,
          text: colors.textSecondary,
          border: colors.border,
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
        {label || status}
      </Text>
    </View>
  );
}

export const StatusBadge = Badge;

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radius.control, // 8px
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeSm: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  badgeMd: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  text: {
    fontWeight: typography.weights.semibold,
    letterSpacing: 0.1,
  },
  textSm: {
    fontSize: typography.sizes.caption,
  },
  textMd: {
    fontSize: typography.sizes.label,
  },
});
