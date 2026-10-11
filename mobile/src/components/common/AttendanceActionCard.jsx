import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, radius, shadows, spacing, typography } from '../../theme/index.js';
import Badge from './Badge.jsx';

export default function AttendanceActionCard({
  isPunchedIn = false,
  isPunchedOut = false,
  punchInTime = '--:--',
  punchOutTime = '--:--',
  locationName,
  workingDuration,
  onPressAction,
  actionLoading = false,
  style,
}) {
  const getStatus = () => {
    if (isPunchedOut) {
      return {
        label: 'Shift Ended',
        variant: 'success',
        dotColor: colors.success,
        actionTitle: 'View Punch Log',
        actionIcon: 'clipboard-text-clock-outline',
        actionBg: colors.surfaceVariant,
        actionTextColor: colors.text,
      };
    }
    if (isPunchedIn) {
      return {
        label: 'Checked In',
        variant: 'primary',
        dotColor: colors.primary,
        actionTitle: 'PUNCH OUT NOW',
        actionIcon: 'door-open',
        actionBg: colors.danger || colors.error,
        actionTextColor: colors.white,
      };
    }
    return {
      label: 'Not Punched Today',
      variant: 'warning',
      dotColor: colors.warning,
      actionTitle: 'PUNCH IN NOW',
      actionIcon: 'fingerprint',
      actionBg: colors.primary,
      actionTextColor: colors.white,
    };
  };

  const status = getStatus();

  return (
    <View style={[styles.card, style]}>
      {/* Top Status & Date */}
      <View style={styles.topRow}>
        <View style={styles.statusGroup}>
          <View style={[styles.statusDot, { backgroundColor: status.dotColor }]} />
          <Text style={styles.statusTitle}>Today's Attendance</Text>
        </View>
        <Badge label={status.label} variant={status.variant} size="sm" />
      </View>

      {/* Main Stats Row */}
      <View style={styles.statsRow}>
        {/* Punch In */}
        <View style={styles.statCol}>
          <Text style={styles.statLabel}>Punch In</Text>
          <Text style={styles.statTime}>{punchInTime || '--:--'}</Text>
          <View style={styles.locationRow}>
            <MaterialCommunityIcons name="map-marker-outline" size={13} color={colors.textSecondary} />
            <Text style={styles.locationText} numberOfLines={1}>
              {locationName || (isPunchedIn ? 'Office Branch' : 'Pending start')}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Punch Out / Active Working Time */}
        <View style={styles.statCol}>
          <Text style={styles.statLabel}>{isPunchedOut ? 'Punch Out' : 'Active Time'}</Text>
          <Text style={[styles.statTime, isPunchedIn && { color: colors.primary }]}>
            {isPunchedOut ? punchOutTime || '--:--' : workingDuration || '--:--'}
          </Text>
          <Text style={styles.locationTextSub}>
            {isPunchedOut ? 'Shift completed' : isPunchedIn ? '⏱️ Tracking live' : 'Shift not started'}
          </Text>
        </View>
      </View>

      {/* Primary 48pt Action CTA Button */}
      {onPressAction && (
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: status.actionBg }]}
          onPress={onPressAction}
          disabled={actionLoading}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={status.actionTitle}
        >
          <MaterialCommunityIcons name={status.actionIcon} size={22} color={status.actionTextColor} />
          <Text style={[styles.actionText, { color: status.actionTextColor }]}>
            {actionLoading ? 'Verifying GPS...' : status.actionTitle}
          </Text>
        </TouchableOpacity>
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
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  statusGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusTitle: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  statCol: {
    flex: 1,
  },
  divider: {
    width: 1,
    height: 48,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
  statLabel: {
    fontSize: typography.sizes.caption,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
    marginBottom: 2,
  },
  statTime: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
    letterSpacing: -0.3,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  locationText: {
    fontSize: 11,
    color: colors.textSecondary,
    flex: 1,
  },
  locationTextSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  actionBtn: {
    height: 50,
    borderRadius: radius.button,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionText: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    letterSpacing: 0.3,
  },
});
