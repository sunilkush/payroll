import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, radius, shadows, spacing, typography } from '../../theme/index.js';

export default function StatCard({
  title,
  value,
  subtitle,
  icon,
  iconColor = colors.primary,
  iconBg = colors.primaryLight,
  badge,
  badgeVariant = 'default',
  onPress,
  style,
}) {
  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      activeOpacity={onPress ? 0.75 : 1}
      onPress={onPress}
      style={[styles.card, shadows.sm, style]}
    >
      <View style={styles.topRow}>
        {icon && (
          <View style={[styles.iconWrapper, { backgroundColor: iconBg }]}>
            <MaterialCommunityIcons name={icon} size={20} color={iconColor} />
          </View>
        )}
        {badge ? (
          <View style={styles.badgeContainer}>
            {badge}
          </View>
        ) : null}
      </View>
      <View style={styles.content}>
        <Text style={styles.value} numberOfLines={1}>
          {value}
        </Text>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </Container>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card, // 14px
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.cardPadding, // 16px
    flex: 1,
    minWidth: 140,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: radius.control, // 8px
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeContainer: {
    marginLeft: 'auto',
  },
  content: {
    marginTop: 2,
  },
  value: {
    fontSize: typography.sizes.h1, // 24px
    fontWeight: typography.weights.bold,
    color: colors.text,
    letterSpacing: -0.3,
  },
  title: {
    fontSize: typography.sizes.label, // 13px
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
    marginTop: 2,
  },
  subtitle: {
    fontSize: typography.sizes.caption, // 12px
    color: colors.textMuted,
    marginTop: 2,
  },
});
