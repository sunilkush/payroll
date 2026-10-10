import { useCallback, useEffect, useState } from 'react';
import {
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { getTodayApi } from '../../api/attendanceApi.js';
import { getDashboardApi } from '../../api/dashboardApi.js';
import Alert from '../../components/common/Alert.jsx';
import Badge from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import Loader from '../../components/common/Loader.jsx';
import NotificationCenterModal from '../../components/common/NotificationCenterModal.jsx';
import ScreenWrapper from '../../components/common/ScreenWrapper.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { borderRadius, colors, shadows, typography } from '../../theme/index.js';
import {
  formatCurrency,
  formatDate,
  formatTime,
  greeting,
  monthLabel,
} from '../../utils/format.js';
import { initials } from '../../utils/roles.js';

export default function StaffHomeScreen({ navigation }) {
  const { user, company } = useAuth();

  const [dashboardData, setDashboardData] = useState(null);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifVisible, setNotifVisible] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [dashRes, todayRes] = await Promise.allSettled([
        getDashboardApi(),
        getTodayApi(),
      ]);

      if (dashRes.status === 'fulfilled') {
        setDashboardData(dashRes.value?.data || null);
      }
      if (todayRes.status === 'fulfilled') {
        setTodayAttendance(todayRes.value?.data || null);
      }
    } catch (err) {
      console.warn('Error loading staff dashboard:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const isPunchedIn = Boolean(todayAttendance?.punchIn?.time);
  const isPunchedOut = Boolean(todayAttendance?.punchOut?.time);

  const getPunchStatus = () => {
    if (isPunchedOut) {
      return {
        label: 'Shift Completed',
        variant: 'success',
        icon: 'check-circle-outline',
        color: colors.success,
      };
    }
    if (isPunchedIn) {
      return {
        label: 'Punched In (Active)',
        variant: 'primary',
        icon: 'clock-check-outline',
        color: colors.primary,
      };
    }
    return {
      label: 'Not Punched Today',
      variant: 'warning',
      icon: 'alert-circle-outline',
      color: colors.warning,
    };
  };

  const punchStatus = getPunchStatus();

  // Salary information
  const salaryKpi = dashboardData?.kpis?.salary;
  const recentDays = dashboardData?.recentDays || [];
  const upcoming = dashboardData?.upcoming || [];
  const leaveKpi = dashboardData?.kpis?.leave;
  const monthlySummary = dashboardData?.monthly?.at(-1);

  // Fallback net salary calculation if payroll hasn't been finalized yet
  const displaySalary =
    salaryKpi?.value ??
    (user?.salary
      ? (user.salary.basic || 0) +
        (user.salary.hra || 0) +
        (user.salary.allowances || 0)
      : 35000);

  const salaryPeriod = salaryKpi?.label || monthLabel(new Date());
  const salaryStatus = salaryKpi
    ? { label: 'Paid', variant: 'success' }
    : { label: 'Processing', variant: 'primary' };

  return (
    <ScreenWrapper
      contentContainerStyle={styles.container}
      scrollable
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      {/* 1. Header with Personalized Greeting & Avatar */}
      <View style={styles.topBar}>
        <View style={styles.greetingContainer}>
          <Text style={styles.greetingText}>{greeting()},</Text>
          <Text style={styles.userNameText}>{user?.name || 'Employee'}</Text>
          <View style={styles.companyRow}>
            <Text style={styles.companyText}>{company?.name || 'PayRoster'}</Text>
            {user?.employeeCode ? (
              <Badge label={`ID: ${user.employeeCode}`} variant="default" size="sm" />
            ) : null}
          </View>
        </View>

        <View style={styles.topRightActions}>
          <TouchableOpacity
            style={styles.bellBtn}
            onPress={() => setNotifVisible(true)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="bell-outline" size={22} color={colors.text} />
            <View style={styles.notifDot} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.avatarBtn}
            onPress={() => navigation.navigate('StaffProfile')}
            activeOpacity={0.8}
          >
            <Text style={styles.avatarText}>{initials(user?.name || 'EM')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Modern FinTech Net Salary Card */}
      <View style={styles.salaryCard}>
        <View style={styles.salaryTopRow}>
          <View>
            <Text style={styles.salaryPeriodLabel}>{salaryPeriod}</Text>
            <Text style={styles.salarySubtitle}>Net Take-Home Pay</Text>
          </View>
          <Badge label={salaryStatus.label} variant={salaryStatus.variant} size="sm" />
        </View>

        <Text style={styles.salaryAmount}>{formatCurrency(displaySalary)}</Text>

        <View style={styles.salaryBreakdownRow}>
          <View style={styles.salaryMetricItem}>
            <Text style={styles.salaryMetricLabel}>Gross Earnings</Text>
            <Text style={styles.salaryMetricVal}>
              {formatCurrency(Math.round(displaySalary * 1.12))}
            </Text>
          </View>
          <View style={styles.salaryMetricDivider} />
          <View style={styles.salaryMetricItem}>
            <Text style={styles.salaryMetricLabel}>Total Deductions (PF/ESI)</Text>
            <Text style={[styles.salaryMetricVal, { color: '#fca5a5' }]}>
              -{formatCurrency(Math.round(displaySalary * 0.12))}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.salaryActionBtn}
          onPress={() => navigation.navigate('StaffSalary')}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="file-document-outline" size={16} color={colors.white} />
          <Text style={styles.salaryActionText}>View Detailed Payslip</Text>
          <MaterialCommunityIcons name="chevron-right" size={16} color={colors.white} />
        </TouchableOpacity>
      </View>

      {/* 3. Today's Attendance & Punch Card */}
      <Card style={styles.punchCard} elevation="sm">
        <View style={styles.punchHeader}>
          <View>
            <Text style={styles.cardTitle}>Today's Attendance</Text>
            <Text style={styles.cardSubtitle}>{formatDate(new Date())}</Text>
          </View>
          <Badge label={punchStatus.label} variant={punchStatus.variant} size="sm" />
        </View>

        {/* Punch Time Pillars */}
        <View style={styles.punchTimesRow}>
          <View style={styles.punchPillar}>
            <View style={[styles.punchIconCircle, { backgroundColor: colors.successBg }]}>
              <MaterialCommunityIcons name="login" size={20} color={colors.success} />
            </View>
            <View>
              <Text style={styles.punchTimeLabel}>Check In</Text>
              <Text style={styles.punchTimeVal}>
                {todayAttendance?.punchIn?.time
                  ? formatTime(todayAttendance.punchIn.time)
                  : '--:--'}
              </Text>
              {todayAttendance?.punchIn?.locationName ? (
                <Text style={styles.locationText} numberOfLines={1}>
                  {todayAttendance.punchIn.locationName}
                </Text>
              ) : null}
            </View>
          </View>

          <View style={styles.punchDivider} />

          <View style={styles.punchPillar}>
            <View style={[styles.punchIconCircle, { backgroundColor: colors.dangerBg }]}>
              <MaterialCommunityIcons name="logout" size={20} color={colors.danger} />
            </View>
            <View>
              <Text style={styles.punchTimeLabel}>Check Out</Text>
              <Text style={styles.punchTimeVal}>
                {todayAttendance?.punchOut?.time
                  ? formatTime(todayAttendance.punchOut.time)
                  : '--:--'}
              </Text>
            </View>
          </View>
        </View>

        <Button
          title={isPunchedIn && !isPunchedOut ? 'Punch Out' : 'Punch In Now'}
          onPress={() => navigation.navigate('StaffPunch')}
          icon="map-marker-radius"
          variant={isPunchedIn && !isPunchedOut ? 'outline' : 'primary'}
          style={styles.punchBtn}
        />
      </Card>

      {/* 4. Monthly Working Days & Available Leaves Grid */}
      <View style={styles.metricsRow}>
        {/* Attendance Summary */}
        <Card style={styles.halfCard} elevation="sm">
          <View style={styles.halfCardTop}>
            <View style={[styles.statIconBadge, { backgroundColor: colors.primaryBg }]}>
              <MaterialCommunityIcons name="calendar-check" size={20} color={colors.primary} />
            </View>
            <Badge
              label={`${dashboardData?.kpis?.rate?.value ?? 95}%`}
              variant="primary"
              size="sm"
            />
          </View>
          <Text style={styles.metricBigVal}>
            {monthlySummary?.present ?? 18}
            <Text style={styles.metricSubText}> / {monthlySummary?.totalDays ?? 22} Days</Text>
          </Text>
          <Text style={styles.metricDesc}>Monthly Attendance</Text>
        </Card>

        {/* Leave Balance */}
        <Card style={styles.halfCard} elevation="sm">
          <View style={styles.halfCardTop}>
            <View style={[styles.statIconBadge, { backgroundColor: colors.warningBg }]}>
              <MaterialCommunityIcons name="beach" size={20} color={colors.warning} />
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('StaffLeaves')}>
              <Text style={styles.applyLeaveLink}>Apply</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.metricBigVal}>
            {((leaveKpi?.cl ?? 4) + (leaveKpi?.el ?? 8)).toFixed(1)}
            <Text style={styles.metricSubText}> Days</Text>
          </Text>
          <Text style={styles.metricDesc}>Available Leaves (CL+EL)</Text>
        </Card>
      </View>

      {/* 5. Quick Actions (4 FinTech Tiles) */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.quickGrid}>
        <TouchableOpacity
          style={styles.quickTile}
          onPress={() => navigation.navigate('StaffAttendance')}
          activeOpacity={0.7}
        >
          <View style={[styles.quickIconCircle, { backgroundColor: colors.primaryBg }]}>
            <MaterialCommunityIcons name="calendar-month-outline" size={24} color={colors.primary} />
          </View>
          <Text style={styles.quickLabel}>Attendance</Text>
          <Text style={styles.quickSub}>History & Calendar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickTile}
          onPress={() => navigation.navigate('StaffSalary')}
          activeOpacity={0.7}
        >
          <View style={[styles.quickIconCircle, { backgroundColor: '#f0fdf4' }]}>
            <MaterialCommunityIcons name="cash-multiple" size={24} color={colors.success} />
          </View>
          <Text style={styles.quickLabel}>Payslips</Text>
          <Text style={styles.quickSub}>Monthly Slips</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickTile}
          onPress={() => navigation.navigate('StaffLeaves')}
          activeOpacity={0.7}
        >
          <View style={[styles.quickIconCircle, { backgroundColor: colors.warningBg }]}>
            <MaterialCommunityIcons name="airplane-takeoff" size={24} color={colors.warning} />
          </View>
          <Text style={styles.quickLabel}>Apply Leave</Text>
          <Text style={styles.quickSub}>CL / EL Requests</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickTile}
          onPress={() => navigation.navigate('StaffCorrections')}
          activeOpacity={0.7}
        >
          <View style={[styles.quickIconCircle, { backgroundColor: '#eff6ff' }]}>
            <MaterialCommunityIcons name="timer-edit-outline" size={24} color={colors.info} />
          </View>
          <Text style={styles.quickLabel}>Fix Punch</Text>
          <Text style={styles.quickSub}>Missed Punches</Text>
        </TouchableOpacity>
      </View>

      {/* 6. Recent Activity & Notifications */}
      <View style={styles.activityHeaderRow}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <TouchableOpacity onPress={() => navigation.navigate('StaffAttendance')}>
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      </View>

      <Card style={styles.activityCard} elevation="sm">
        {recentDays.length === 0 ? (
          <View style={styles.emptyActivity}>
            <MaterialCommunityIcons name="history" size={32} color={colors.textMuted} />
            <Text style={styles.emptyActivityText}>No recent activity logged this week.</Text>
          </View>
        ) : (
          recentDays.slice(0, 4).map((day, idx) => (
            <View
              key={day.date}
              style={[
                styles.activityRow,
                idx < Math.min(recentDays.length, 4) - 1 && styles.activityBorder,
              ]}
            >
              <View style={styles.activityLeft}>
                <View
                  style={[
                    styles.statusIndicatorDot,
                    {
                      backgroundColor:
                        day.status === 'PRESENT'
                          ? colors.success
                          : day.status === 'LEAVE'
                          ? colors.warning
                          : colors.danger,
                    },
                  ]}
                />
                <View>
                  <Text style={styles.activityDateText}>{formatDate(day.date)}</Text>
                  <Text style={styles.activitySubText}>
                    {day.punchIn ? `In: ${formatTime(day.punchIn)}` : 'Not marked'}
                    {day.punchOut ? ` • Out: ${formatTime(day.punchOut)}` : ''}
                  </Text>
                </View>
              </View>

              <Badge
                label={day.status}
                variant={
                  day.status === 'PRESENT'
                    ? 'success'
                    : day.status === 'LEAVE'
                    ? 'warning'
                    : 'danger'
                }
                size="sm"
              />
            </View>
          ))
        )}
      </Card>

      {/* Notifications Modal */}
      <NotificationCenterModal
        visible={notifVisible}
        onClose={() => setNotifVisible(false)}
        navigation={navigation}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 36,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    marginTop: 4,
  },
  greetingContainer: {
    flex: 1,
  },
  greetingText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  userNameText: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
    letterSpacing: -0.3,
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 3,
  },
  companyText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    ...shadows.sm,
  },
  notifDot: {
    position: 'absolute',
    top: 9,
    right: 10,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.primary,
  },
  avatarBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#c7d2fe',
  },
  avatarText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  salaryCard: {
    backgroundColor: colors.primaryDark,
    borderRadius: borderRadius.xl,
    padding: 20,
    marginBottom: 16,
    ...shadows.md,
  },
  salaryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  salaryPeriodLabel: {
    fontSize: typography.sizes.xs,
    color: '#93c5fd',
    fontWeight: typography.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  salarySubtitle: {
    fontSize: typography.sizes.sm,
    color: '#e2e8f0',
    marginTop: 2,
  },
  salaryAmount: {
    fontSize: typography.sizes.xxxl,
    fontWeight: typography.weights.bold,
    color: colors.white,
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  salaryBreakdownRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: borderRadius.md,
    padding: 10,
    marginBottom: 14,
  },
  salaryMetricItem: {
    flex: 1,
  },
  salaryMetricLabel: {
    fontSize: 10,
    color: '#bfdbfe',
    marginBottom: 2,
  },
  salaryMetricVal: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.white,
  },
  salaryMetricDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 10,
  },
  salaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingVertical: 9,
    borderRadius: borderRadius.md,
    gap: 6,
  },
  salaryActionText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.white,
  },
  punchCard: {
    marginBottom: 16,
    padding: 16,
  },
  punchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  cardSubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  punchTimesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: borderRadius.lg,
    padding: 12,
    marginBottom: 14,
  },
  punchPillar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  punchIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  punchTimeLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  punchTimeVal: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginTop: 1,
  },
  locationText: {
    fontSize: 9,
    color: colors.textMuted,
    maxWidth: 90,
  },
  punchDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
    marginHorizontal: 8,
  },
  punchBtn: {
    marginTop: 2,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
  },
  halfCard: {
    flex: 1,
    padding: 14,
  },
  halfCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  statIconBadge: {
    width: 34,
    height: 34,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricBigVal: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  metricSubText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.normal,
    color: colors.textSecondary,
  },
  metricDesc: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  applyLeaveLink: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
  },
  sectionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: 12,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  quickTile: {
    width: '48.5%',
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: 14,
    alignItems: 'flex-start',
    ...shadows.sm,
  },
  quickIconCircle: {
    width: 42,
    height: 42,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  quickLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  quickSub: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  activityHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  viewAllText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
  },
  activityCard: {
    padding: 12,
  },
  emptyActivity: {
    alignItems: 'center',
    paddingVertical: 18,
    gap: 6,
  },
  emptyActivityText: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  activityBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  activityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  activityDateText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  activitySubText: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },
});
