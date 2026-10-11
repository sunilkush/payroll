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
import Avatar from '../../components/common/Avatar.jsx';
import Badge from '../../components/common/Badge.jsx';
import Card from '../../components/common/Card.jsx';
import NotificationCenterModal from '../../components/common/NotificationCenterModal.jsx';
import ScreenWrapper from '../../components/common/ScreenWrapper.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { colors, radius, shadows, spacing, typography } from '../../theme/index.js';
import {
  formatCurrency,
  formatDate,
  greeting,
  monthLabel,
} from '../../utils/format.js';

export default function StaffHomeScreen({ navigation }) {
  const { user } = useAuth();

  const [dashboardData, setDashboardData] = useState(null);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifVisible, setNotifVisible] = useState(false);
  const [salaryVisible, setSalaryVisible] = useState(true);

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
  const monthlyList = Array.isArray(dashboardData?.monthly) ? dashboardData.monthly : [];
  const monthlySummary = monthlyList.length > 0 ? monthlyList[monthlyList.length - 1] : null;

  // Dynamic net salary calculation
  const displaySalary =
    salaryKpi?.value ??
    (user?.salaryStructure
      ? (user.salaryStructure.basic || 0) +
        (user.salaryStructure.hra || 0) +
        (user.salaryStructure.special || 0) +
        (user.salaryStructure.other || 0)
      : user?.salary
      ? (user.salary.basic || 0) +
        (user.salary.hra || 0) +
        (user.salary.allowances || 0)
      : 0);

  const salaryPeriod = salaryKpi?.label || monthLabel(new Date());
  const salaryStatus = salaryKpi
    ? { label: 'Paid', variant: 'success' }
    : { label: 'Processing', variant: 'primary' };

  const totalDaysInMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth() + 1,
    0
  ).getDate();
  const presentCount = monthlySummary?.present ?? (dashboardData?.today?.punchIn ? 1 : 0);
  const totalDaysCount = monthlySummary?.totalDays ?? totalDaysInMonth;

  const leaveBalance =
    leaveKpi?.balance ??
    (leaveKpi ? Number(leaveKpi?.cl || 0) + Number(leaveKpi?.el || 0) : null) ??
    (user?.leaves?.remaining ?? 0);

  const recentActivities = dashboardData?.activity?.length
    ? dashboardData.activity.map((a) => ({
        title: a.text || a.title || 'Work activity',
        sub: a.detail || a.sub || 'Logged in system',
        time: a.at ? formatDate(a.at) : 'Recent',
        icon: 'clock-check-outline',
      }))
    : recentDays.length
    ? recentDays.slice(-3).reverse().map((d) => ({
        title: `Attendance: ${d.status || 'Logged'}`,
        sub: `${d.date}${d.punchIn?.time ? ` • In: ${d.punchIn.time}` : ''}`,
        time: d.date,
        icon: 'calendar-check-outline',
      }))
    : [];

  return (
    <ScreenWrapper
      contentContainerStyle={styles.container}
      scrollable
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      {/* 1. Header with Greeting & Avatar */}
      <View style={styles.topBar}>
        <View style={styles.greetingContainer}>
          <View style={styles.greetingRow}>
            <MaterialCommunityIcons name="weather-sunny" size={15} color={colors.warning} style={{ marginRight: 4 }} />
            <Text style={styles.greetingText}>{greeting()}</Text>
          </View>
          <Text style={styles.userNameText}>{user?.name || 'Employee'}</Text>
          <Text style={styles.userRoleSubtitle}>{user?.designation || 'Staff Member'}</Text>
        </View>

        <View style={styles.topRightActions}>
          <TouchableOpacity
            style={styles.bellBtn}
            onPress={() => setNotifVisible(true)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="bell-outline" size={20} color={colors.text} />
            <View style={styles.notifDot} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('StaffProfile')}
            activeOpacity={0.8}
          >
            <Avatar name={user?.name || 'Staff'} size={38} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Today's Attendance & Hero Punch Card */}
      <Card style={styles.punchHeroCard}>
        <View style={styles.punchHeroTopRow}>
          <View style={styles.punchHeroStatusGroup}>
            <View
              style={[
                styles.punchStatusIndicator,
                isPunchedOut
                  ? styles.indicatorSuccess
                  : isPunchedIn
                  ? styles.indicatorPrimary
                  : styles.indicatorWarning,
              ]}
            />
            <Text style={styles.punchHeroDateText}>
              Today • {formatDate(new Date())}
            </Text>
          </View>
          <Badge
            label={punchStatus.label}
            variant={punchStatus.variant}
            size="sm"
          />
        </View>

        <View style={styles.punchHeroBody}>
          <View style={styles.punchHeroTimeCol}>
            {isPunchedIn ? (
              <>
                <Text style={styles.punchHeroTimeLabel}>Punch In Time</Text>
                <Text style={styles.punchHeroTimeVal}>
                  {todayAttendance?.punchIn?.time || '--:--'}
                </Text>
                {todayAttendance?.punchIn?.locationName ? (
                  <View style={styles.punchHeroLocRow}>
                    <MaterialCommunityIcons name="map-marker-outline" size={13} color={colors.textSecondary} />
                    <Text style={styles.punchHeroLocText} numberOfLines={1}>
                      {todayAttendance.punchIn.locationName}
                    </Text>
                  </View>
                ) : null}
              </>
            ) : (
              <>
                <Text style={styles.punchHeroTimeLabel}>Attendance Status</Text>
                <Text style={styles.punchHeroTimeVal}>Not Marked</Text>
                <Text style={styles.punchHeroLocText}>Ready to start your work shift</Text>
              </>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.punchHeroActionBtn,
              isPunchedOut
                ? styles.punchHeroActionBtnCompleted
                : isPunchedIn
                ? styles.punchHeroActionBtnOut
                : styles.punchHeroActionBtnIn,
            ]}
            onPress={() => navigation.navigate('StaffPunch')}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons
              name={
                isPunchedOut
                  ? 'clipboard-text-clock-outline'
                  : isPunchedIn
                  ? 'door-open'
                  : 'fingerprint'
              }
              size={20}
              color={colors.white}
            />
            <Text style={styles.punchHeroActionBtnText}>
              {isPunchedOut
                ? 'View Log'
                : isPunchedIn
                ? 'Punch Out'
                : 'Punch In'}
            </Text>
          </TouchableOpacity>
        </View>
      </Card>

      {/* 3. Modern SaaS Net Salary Card with Privacy Toggle */}
      <View style={styles.salaryCard}>
        <View style={styles.salaryTopRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <MaterialCommunityIcons name="wallet-outline" size={18} color="rgba(255,255,255,0.9)" />
            <Text style={styles.salaryPeriodLabel}>
              Net Salary • {salaryPeriod}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity
              onPress={() => setSalaryVisible(!salaryVisible)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialCommunityIcons
                name={salaryVisible ? 'eye-outline' : 'eye-off-outline'}
                size={18}
                color={colors.white}
              />
            </TouchableOpacity>
            <View style={styles.paidPill}>
              <Text style={styles.paidPillText}>{salaryStatus.label}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.salaryAmount}>
          {salaryVisible ? formatCurrency(displaySalary) : '••••••••'}
        </Text>

        <View style={styles.salaryFooterRow}>
          <Text style={styles.salaryCreditedText}>
            {salaryKpi?.paidAt
              ? `Credited on ${formatDate(salaryKpi.paidAt)}`
              : `Disbursement status: ${salaryStatus.label}`}
          </Text>
          <TouchableOpacity
            style={styles.viewSlipLink}
            onPress={() => navigation.navigate('StaffSalary')}
          >
            <Text style={styles.viewSlipText}>View Slips</Text>
            <MaterialCommunityIcons name="chevron-right" size={16} color={colors.white} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 4. Working Days & Leave Balance (Metric Cards Row) */}
      <View style={styles.metricsRow}>
        <View style={styles.metricCard}>
          <View style={styles.metricCardTop}>
            <View style={styles.metricIconCircle}>
              <MaterialCommunityIcons name="calendar-check-outline" size={18} color={colors.primary} />
            </View>
            <Text style={styles.metricCardTitle}>Working Days</Text>
          </View>
          <Text style={styles.metricCardVal}>
            {presentCount} <Text style={styles.metricCardValSub}>/ {totalDaysCount}</Text>
          </Text>
        </View>

        <View style={styles.metricCard}>
          <View style={styles.metricCardTop}>
            <View style={styles.metricIconCircle}>
              <MaterialCommunityIcons name="briefcase-clock-outline" size={18} color={colors.primary} />
            </View>
            <Text style={styles.metricCardTitle}>Leave Balance</Text>
          </View>
          <Text style={styles.metricCardVal}>
            {leaveBalance} <Text style={styles.metricCardValSub}>Days</Text>
          </Text>
        </View>
      </View>

      {/* 5. Upcoming Holiday Banner */}
      {upcoming.length > 0 && (
        <Card style={styles.holidayBannerCard}>
          <View style={styles.holidayBannerLeft}>
            <View style={styles.holidayIconCircle}>
              <MaterialCommunityIcons name="calendar-star" size={20} color={colors.warning} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.holidayTitle} numberOfLines={1}>
                Upcoming: {upcoming[0].title}
              </Text>
              <Text style={styles.holidaySub}>
                {formatDate(upcoming[0].date)} • {upcoming[0].subtitle || 'Paid Company Holiday'}
              </Text>
            </View>
          </View>
          <Badge label="Holiday" variant="warning" size="sm" />
        </Card>
      )}

      {/* 6. Quick Action Grid */}
      <View style={styles.quickGrid}>
        <TouchableOpacity
          style={styles.quickTile}
          onPress={() => navigation.navigate('StaffPunch')}
          activeOpacity={0.7}
        >
          <View style={[styles.quickIconCircle, { backgroundColor: colors.successContainer }]}>
            <MaterialCommunityIcons name="fingerprint" size={22} color={colors.success} />
          </View>
          <Text style={styles.quickLabel}>Punch In/Out</Text>
          <Text style={styles.quickSub}>Quick punch</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickTile}
          onPress={() => navigation.navigate('StaffAttendance')}
          activeOpacity={0.7}
        >
          <View style={[styles.quickIconCircle, { backgroundColor: colors.primaryLight }]}>
            <MaterialCommunityIcons name="calendar-check" size={22} color={colors.primary} />
          </View>
          <Text style={styles.quickLabel}>Attendance</Text>
          <Text style={styles.quickSub}>View history</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickTile}
          onPress={() => navigation.navigate('StaffLeaves')}
          activeOpacity={0.7}
        >
          <View style={[styles.quickIconCircle, { backgroundColor: colors.warningContainer }]}>
            <MaterialCommunityIcons name="calendar-arrow-right" size={22} color={colors.warning} />
          </View>
          <Text style={styles.quickLabel}>Apply Leave</Text>
          <Text style={styles.quickSub}>Time off</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickTile}
          onPress={() => navigation.navigate('StaffSalary')}
          activeOpacity={0.7}
        >
          <View style={[styles.quickIconCircle, { backgroundColor: colors.infoContainer }]}>
            <MaterialCommunityIcons name="file-document-outline" size={22} color={colors.info} />
          </View>
          <Text style={styles.quickLabel}>My Payslips</Text>
          <Text style={styles.quickSub}>Salary slips</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickTile}
          onPress={() => navigation.navigate('StaffCorrections')}
          activeOpacity={0.7}
        >
          <View style={[styles.quickIconCircle, { backgroundColor: colors.surfaceVariant }]}>
            <MaterialCommunityIcons name="clock-edit-outline" size={22} color={colors.textSecondary} />
          </View>
          <Text style={styles.quickLabel}>Corrections</Text>
          <Text style={styles.quickSub}>Attendance fix</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickTile}
          onPress={() => navigation.navigate('StaffMeetings')}
          activeOpacity={0.7}
        >
          <View style={[styles.quickIconCircle, { backgroundColor: colors.primaryLight }]}>
            <MaterialCommunityIcons name="video-outline" size={22} color={colors.primaryDark} />
          </View>
          <Text style={styles.quickLabel}>Meetings</Text>
          <Text style={styles.quickSub}>Schedule & join</Text>
        </TouchableOpacity>
      </View>

      {/* 7. Recent Activity */}
      <View style={styles.activitySection}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <Card style={styles.activityCard}>
          {recentActivities.length === 0 ? (
            <View style={styles.emptyActivityRow}>
              <MaterialCommunityIcons name="information-outline" size={20} color={colors.textSecondary} />
              <Text style={styles.emptyActivityText}>No recent activity logged</Text>
            </View>
          ) : (
            recentActivities.map((item, index) => (
              <View
                key={index}
                style={[
                  styles.activityItem,
                  index < recentActivities.length - 1 && styles.activityItemBorder,
                ]}
              >
                <View style={styles.activityIconCircle}>
                  <MaterialCommunityIcons name={item.icon || 'clock-outline'} size={18} color={colors.primary} />
                </View>
                <View style={styles.activityTextContainer}>
                  <Text style={styles.activityTitle}>{item.title}</Text>
                  <Text style={styles.activitySub}>{item.sub}</Text>
                </View>
                <Text style={styles.activityTime}>{item.time}</Text>
              </View>
            ))
          )}
        </Card>
      </View>

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
    paddingBottom: spacing.xxxl,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    marginTop: spacing.xs,
  },
  greetingContainer: {
    flex: 1,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  greetingText: {
    fontSize: typography.sizes.caption,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  userNameText: {
    fontSize: typography.sizes.h2,
    fontWeight: typography.weights.bold,
    color: colors.text,
    letterSpacing: -0.2,
  },
  userRoleSubtitle: {
    fontSize: typography.sizes.label,
    color: colors.textSecondary,
    marginTop: 1,
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  bellBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    ...shadows.sm,
  },
  notifDot: {
    position: 'absolute',
    top: 8,
    right: 9,
    width: 7,
    height: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },

  // Today's Hero Attendance Card
  punchHeroCard: {
    marginBottom: spacing.lg,
  },
  punchHeroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  punchHeroStatusGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  punchStatusIndicator: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
  },
  indicatorSuccess: {
    backgroundColor: colors.success,
  },
  indicatorPrimary: {
    backgroundColor: colors.primary,
  },
  indicatorWarning: {
    backgroundColor: colors.warning,
  },
  punchHeroDateText: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
  },
  punchHeroBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  punchHeroTimeCol: {
    flex: 1,
  },
  punchHeroTimeLabel: {
    fontSize: typography.sizes.caption,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  punchHeroTimeVal: {
    fontSize: typography.sizes.h2,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  punchHeroLocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 3,
  },
  punchHeroLocText: {
    fontSize: typography.sizes.caption,
    color: colors.textSecondary,
    flex: 1,
  },
  punchHeroActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radius.button,
    ...shadows.sm,
  },
  punchHeroActionBtnIn: {
    backgroundColor: colors.success,
  },
  punchHeroActionBtnOut: {
    backgroundColor: colors.error,
  },
  punchHeroActionBtnCompleted: {
    backgroundColor: colors.primary,
  },
  punchHeroActionBtnText: {
    color: colors.white,
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.bold,
  },

  // Royal Blue Salary Card
  salaryCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  salaryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  salaryPeriodLabel: {
    fontSize: typography.sizes.label,
    color: 'rgba(255, 255, 255, 0.95)',
    fontWeight: typography.weights.medium,
  },
  paidPill: {
    backgroundColor: colors.successContainer,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.control,
  },
  paidPillText: {
    color: colors.success,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
  },
  salaryAmount: {
    fontSize: 28,
    fontWeight: typography.weights.bold,
    color: colors.white,
    letterSpacing: -0.5,
    marginBottom: spacing.sm,
  },
  salaryFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    paddingTop: spacing.sm,
  },
  salaryCreditedText: {
    fontSize: typography.sizes.caption,
    color: 'rgba(255, 255, 255, 0.85)',
    flex: 1,
  },
  viewSlipLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewSlipText: {
    color: colors.white,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
  },

  // Holiday Banner
  holidayBannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.warningContainer,
    borderColor: '#FDE68A',
    marginBottom: spacing.lg,
  },
  holidayBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  holidayIconCircle: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  holidayTitle: {
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.bold,
    color: colors.warning,
  },
  holidaySub: {
    fontSize: typography.sizes.caption,
    color: colors.textSecondary,
    marginTop: 1,
  },

  // Metrics Row
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  metricCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  metricIconCircle: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricCardTitle: {
    fontSize: typography.sizes.label,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  metricCardVal: {
    fontSize: typography.sizes.h3,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  metricCardValSub: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.regular,
    color: colors.textSecondary,
  },

  // Quick Action Grid
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  quickTile: {
    width: '31.5%',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    paddingVertical: spacing.md,
    paddingHorizontal: 4,
    alignItems: 'center',
    marginBottom: 4,
    ...shadows.sm,
  },
  quickIconCircle: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  quickLabel: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
    color: colors.text,
    textAlign: 'center',
  },
  quickSub: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
    lineHeight: 14,
  },

  // Activity Section
  activitySection: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.sizes.h4,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  activityCard: {
    padding: spacing.md,
  },
  emptyActivityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  emptyActivityText: {
    fontSize: typography.sizes.body,
    color: colors.textSecondary,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
    marginBottom: spacing.sm,
  },
  activityIconCircle: {
    width: 36,
    height: 36,
    borderRadius: radius.control,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  activityTextContainer: {
    flex: 1,
  },
  activityTitle: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  activitySub: {
    fontSize: typography.sizes.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  activityTime: {
    fontSize: typography.sizes.caption,
    color: colors.textSecondary,
  },
});
