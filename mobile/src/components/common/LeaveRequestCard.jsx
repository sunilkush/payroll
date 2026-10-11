import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, radius, shadows, spacing, typography } from '../../theme/index.js';
import { formatDate } from '../../utils/format.js';
import Badge from './Badge.jsx';

export default function LeaveRequestCard({
  type = 'CL',
  days = 1,
  halfDay,
  fromDate,
  toDate,
  reason,
  status = 'PENDING',
  adminComment,
  onPressCancel,
  canCancel = false,
  style,
}) {
  const getStatusVariant = () => {
    switch (status) {
      case 'APPROVED':
        return 'success';
      case 'REJECTED':
        return 'danger';
      case 'PENDING':
        return 'warning';
      case 'CANCELLED':
      default:
        return 'default';
    }
  };

  const isHalfDay = Boolean(halfDay);
  const dateLabel = fromDate === toDate || isHalfDay
    ? formatDate(fromDate)
    : `${formatDate(fromDate)} – ${formatDate(toDate)}`;

  return (
    <View style={[styles.card, style]}>
      {/* Top Row: Type, Days badge, Status */}
      <View style={styles.topRow}>
        <View style={styles.typeGroup}>
          <View style={styles.typePill}>
            <Text style={styles.typePillText}>{type}</Text>
          </View>
          <Text style={styles.daysText}>
            {days} {days === 1 ? 'Day' : 'Days'} {isHalfDay ? `(${halfDay})` : ''}
          </Text>
        </View>
        <Badge label={status} variant={getStatusVariant()} size="sm" />
      </View>

      {/* Date Range */}
      <View style={styles.dateRow}>
        <MaterialCommunityIcons name="calendar-range" size={15} color={colors.textSecondary} />
        <Text style={styles.dateText}>{dateLabel}</Text>
      </View>

      {/* Reason */}
      {Boolean(reason) && (
        <View style={styles.reasonBox}>
          <Text style={styles.reasonText} numberOfLines={2}>
            "{reason}"
          </Text>
        </View>
      )}

      {/* Admin remarks / Footer action */}
      <View style={styles.footerRow}>
        {adminComment ? (
          <Text style={styles.commentText} numberOfLines={1}>
            Admin: {adminComment}
          </Text>
        ) : (
          <View style={{ flex: 1 }} />
        )}

        {canCancel && status === 'PENDING' && onPressCancel && (
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={onPressCancel}
            activeOpacity={0.7}
            accessibilityRole="button"
          >
            <MaterialCommunityIcons name="close-circle-outline" size={14} color={colors.error} />
            <Text style={styles.cancelBtnText}>Withdraw</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.xs,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  typeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryLight,
  },
  typePillText: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: colors.primaryDark,
  },
  daysText: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: 4,
  },
  dateText: {
    fontSize: typography.sizes.caption,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  reasonBox: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: radius.control,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    marginVertical: 4,
  },
  reasonText: {
    fontSize: 12,
    color: colors.text,
    fontStyle: 'italic',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  commentText: {
    fontSize: 11,
    color: colors.textSecondary,
    flex: 1,
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.errorContainer,
  },
  cancelBtnText: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: colors.error,
  },
});
