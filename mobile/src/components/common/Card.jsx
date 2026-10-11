import { StyleSheet, View } from 'react-native';
import { colors, radius, shadows, spacing } from '../../theme/index.js';

export default function Card({
  children,
  style,
  elevation = 'sm',
  variant = 'default', // 'default' | 'flat' | 'outlined' | 'elevated'
  padding = 'md', // 'sm' | 'md' | 'lg' | 'none'
  ...rest
}) {
  const getVariantStyle = () => {
    switch (variant) {
      case 'flat':
        return styles.flat;
      case 'outlined':
        return styles.outlined;
      case 'elevated':
        return [styles.elevated, shadows[elevation] || shadows.md];
      default:
        return [styles.default, shadows[elevation] || shadows.sm];
    }
  };

  const getPaddingStyle = () => {
    switch (padding) {
      case 'none':
        return { padding: 0 };
      case 'sm':
        return { padding: spacing.sm };
      case 'lg':
        return { padding: spacing.xl };
      default:
        return { padding: spacing.lg }; // 16px
    }
  };

  return (
    <View style={[styles.base, getVariantStyle(), getPaddingStyle(), style]} {...rest}>
      {children}
    </View>
  );
}

export const AppCard = Card;

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.card,
    borderRadius: radius.card, // 14px
    overflow: 'hidden',
  },
  default: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  flat: {
    borderWidth: 0,
    backgroundColor: colors.surfaceVariant,
  },
  outlined: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  elevated: {
    borderWidth: 0.5,
    borderColor: colors.borderLight,
  },
});
