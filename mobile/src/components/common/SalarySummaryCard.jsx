import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, radius, shadows, spacing, typography } from '../../theme/index.js';
import { formatCurrency } from '../../utils/format.js';
import Badge from './Badge.jsx';

export default function SalarySummaryCard({
  amount = 0,
  period,
  status = 'Paid',
  statusVariant = 'success',
  grossAmount,
  deductionsAmount,
  onPressViewSlips,
  initialVisible = false,
  style,
}) {
  const [isVisible, setIsVisible] = useState(initialVisible);

  return (
    <View style={[styles.card, style]}>
      {/* Top Header */}
      <View style={styles.topRow}>
        <View style={styles.headerLeft}>
          <View style={styles.walletIcon}>
            <MaterialCommunityIcons name="wallet-outline" size={16} color={colors.primary} />
          </View>
          <Text style={styles.periodText}>Net Salary • {period || 'Current Month'}</Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() => setIsVisible(!isVisible)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={styles.eyeBtn}
            accessibilityRole="button"
            accessibilityLabel={isVisible ? 'Hide salary amount' : 'Show salary amount'}
          >
            <MaterialCommunityIcons
              name={isVisible ? 'eye-outline' : 'eye-off-outline'}
              size={18}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
          <Badge label={status} variant={statusVariant} size="sm" />
        </View>
      </View>

      {/* Main Amount */}
      <Text style={styles.amountText} numberOfLines={1}>
        {isVisible ? formatCurrency(amount) : '₹ ••••••••'}
      </Text>

      {/* Sub Breakdown Strip */}
      {(grossAmount !== undefined || deductionsAmount !== undefined) && (
        <View style={styles.subStatsRow}>
          {grossAmount !== undefined && (
            <Text style={styles.subStatText}>
              Gross: <Text style={styles.subStatVal}>{isVisible ? formatCurrency(grossAmount) : '••••'}</Text>
            </Text>
          )}
          {grossAmount !== undefined && deductionsAmount !== undefined && (
            <Text style={styles.dotSeparator}>•</Text>
          )}
          {deductionsAmount !== undefined && (
            <Text style={styles.subStatText}>
              Deductions: <Text style={[styles.subStatVal, { color: colors.error }]}>{isVisible ? formatCurrency(deductionsAmount) : '••••'}</Text>
            </Text>
          )}
        </View>
      )}

      {/* Footer Row */}
      {onPressViewSlips && (
        <View style={styles.footerRow}>
          <Text style={styles.footerHint}>Detailed breakdown in payslips</Text>
          <TouchableOpacity
            style={styles.viewLink}
            onPress={onPressViewSlips}
            activeOpacity={0.7}
            accessibilityRole="button"
          >
            <Text style={styles.viewLinkText}>View Slips</Text>
            <MaterialCommunityIcons name="chevron-right" size={16} color={colors.primary} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.cardPadding,
    ...shadows.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  walletIcon: {
    width: 26,
    height: 26,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodText: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eyeBtn: {
    padding: 4,
  },
  amountText: {
    fontSize: 26,
    fontWeight: typography.weights.bold,
    color: colors.primary,
    letterSpacing: -0.5,
    marginVertical: spacing.xs,
  },
  subStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: 4,
  },
  subStatText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  subStatVal: {
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  dotSeparator: {
    fontSize: 10,
    color: colors.textMuted,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  footerHint: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  viewLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewLinkText: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
});
