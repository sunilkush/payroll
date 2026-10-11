import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, radius, shadows, spacing, typography } from '../../theme/index.js';

export default function SummaryCard({
  title,
  value,
  subtitle,
  icon,
  iconColor = colors.primary,
  iconBgColor = colors.primaryLight,
  trend,
  trendPositive = true,
  onPress,
  style,
}) {
  const CardContainer = onPress ? TouchableOpacity : View;

  return (
    <CardContainer
      style={[styles.card, style]}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole={onPress ? 'button' : undefined}
    >
      <View style={styles.topRow}>
        {icon && (
          <View style={[styles.iconCircle, { backgroundColor: iconBgColor }]}>
            <MaterialCommunityIcons name={icon} size={20} color={iconColor} />
          </View>
        )}
        {trend && (
          <View style={[styles.trendBadge, { backgroundColor: trendPositive ? colors.successContainer : colors.errorContainer }]}>
            <MaterialCommunityIcons
              name={trendPositive ? 'trending-up' : 'trending-down'}
              size={12}
              color={trendPositive ? colors.success : colors.error}
            />
            <Text style={[styles.trendText, { color: trendPositive ? colors.success : colors.error }]}>
              {trend}
            </Text>
          </View>
        )}
      </View>

      <Text style={styles.valueText} numberOfLines={1}>
        {value}
      </Text>

      <Text style={styles.titleText} numberOfLines={1}>
        {title}
      </Text>

      {subtitle && (
        <Text style={styles.subtitleText} numberOfLines={1}>
          {subtitle}
        </Text>
      )}
    </CardContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.cardPadding,
    ...shadows.xs,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  trendText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
  valueText: {
    fontSize: typography.sizes.h2,
    fontWeight: typography.weights.bold,
    color: colors.text,
    letterSpacing: -0.3,
    marginTop: 2,
  },
  titleText: {
    fontSize: 12,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
    marginTop: 2,
  },
  subtitleText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
});
