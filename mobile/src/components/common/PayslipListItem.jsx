import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, radius, shadows, spacing, typography } from '../../theme/index.js';
import { formatCurrency, formatMonth } from '../../utils/format.js';
import Badge from './Badge.jsx';

export default function PayslipListItem({
  period,
  netSalary,
  grossSalary,
  status = 'Paid',
  onPress,
  style,
}) {
  const isPaid = (status || '').toLowerCase() === 'paid' || (status || '').toLowerCase() === 'final';

  return (
    <TouchableOpacity
      style={[styles.card, style]}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`Payslip for ${formatMonth(period)}, net amount ${formatCurrency(netSalary || 0)}`}
    >
      <View style={styles.leftCol}>
        <View style={styles.iconCircle}>
          <MaterialCommunityIcons name="file-document-outline" size={20} color={colors.primary} />
        </View>
        <View style={styles.info}>
          <Text style={styles.periodText}>{formatMonth(period)}</Text>
          <Text style={styles.subText}>
            Gross: {formatCurrency(grossSalary || netSalary || 0)}
          </Text>
        </View>
      </View>

      <View style={styles.rightCol}>
        <Text style={styles.netAmount}>{formatCurrency(netSalary || 0)}</Text>
        <Badge
          label={isPaid ? 'Paid' : 'Pending'}
          variant={isPaid ? 'success' : 'warning'}
          size="sm"
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    ...shadows.xs,
  },
  leftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  periodText: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: 2,
  },
  subText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  rightCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  netAmount: {
    fontSize: typography.sizes.h4 || 17,
    fontWeight: typography.weights.bold,
    color: colors.text,
    letterSpacing: -0.2,
  },
});
