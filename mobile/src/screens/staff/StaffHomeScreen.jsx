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
      {/* 1. Header with Personalized Greeting & Avatar */}
      <View style={styles.topBar}>
        <View style={styles.greetingContainer}>
          <View style={styles.greetingRow}>
            <MaterialCommunityIcons name="weather-sunny" size={15} color="#eab308" style={{ marginRight: 4 }} />
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

      {/* 2. Royal Blue Net Salary Card */}
      <View style={styles.salaryCard}>
        <View style={styles.salaryTopRow}>
          <Text style={styles.salaryPeriodLabel}>
            Net Salary - {salaryPeriod}
          </Text>
          <View style={styles.paidPill}>
            <Text style={styles.paidPillText}>{salaryStatus.label}</Text>
          </View>
        </View>

        <Text style={styles.salaryAmount}>
          {formatCurrency(displaySalary)}
        </Text>

        <Text style={styles.salaryCreditedText}>
          {salaryKpi?.paidAt
            ? `Salary credited on ${formatDate(salaryKpi.paidAt)}`
            : `Payroll period: ${salaryPeriod}`}
        </Text>
      </View>

      {/* 3. Working Days & Leave Balance (2 Metric Cards Row) */}
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
            <View style={[styles.metricIconCircle, { backgroundColor: '#eff6ff' }]}>
              <MaterialCommunityIcons name="briefcase-clock-outline" size={18} color={colors.primary} />
            </View>
            <Text style={styles.metricCardTitle}>Leave Balance</Text>
          </View>
          <Text style={styles.metricCardVal}>
            {leaveBalance} <Text style={styles.metricCardValSub}>Days</Text>
          </Text>
        </View>
      </View>

      {/* 4. Six Quick Action Tiles (Showing All Feature Icons) */}
      <View style={styles.quickGrid}>
        <TouchableOpacity
          style={styles.quickTile}
          onPress={() => navigation.navigate('StaffPunch')}
          activeOpacity={0.7}
        >
          <View style={styles.quickIconCircle}>
            <MaterialCommunityIcons name="fingerprint" size={24} color={colors.primary} />
          </View>
          <Text style={styles.quickLabel}>Punch In/Out</Text>
          <Text style={styles.quickSub}>Quick punch</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickTile}
          onPress={() => navigation.navigate('StaffAttendance')}
          activeOpacity={0.7}
        >
          <View style={styles.quickIconCircle}>
            <MaterialCommunityIcons name="calendar-check" size={24} color={colors.primary} />
          </View>
          <Text style={styles.quickLabel}>Attendance</Text>
          <Text style={styles.quickSub}>View history</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickTile}
          onPress={() => navigation.navigate('StaffLeaves')}
          activeOpacity={0.7}
        >
          <View style={styles.quickIconCircle}>
            <MaterialCommunityIcons name="calendar-arrow-right" size={24} color={colors.primary} />
          </View>
          <Text style={styles.quickLabel}>Apply Leave</Text>
          <Text style={styles.quickSub}>Time off</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickTile}
          onPress={() => navigation.navigate('StaffSalary')}
          activeOpacity={0.7}
        >
          <View style={styles.quickIconCircle}>
            <MaterialCommunityIcons name="file-document-outline" size={24} color={colors.primary} />
          </View>
          <Text style={styles.quickLabel}>My Payslips</Text>
          <Text style={styles.quickSub}>Salary slips</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickTile}
          onPress={() => navigation.navigate('StaffCorrections')}
          activeOpacity={0.7}
        >
          <View style={styles.quickIconCircle}>
            <MaterialCommunityIcons name="clock-edit-outline" size={24} color={colors.primary} />
          </View>
          <Text style={styles.quickLabel}>Corrections</Text>
          <Text style={styles.quickSub}>Attendance fix</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickTile}
          onPress={() => navigation.navigate('StaffMeetings')}
          activeOpacity={0.7}
        >
          <View style={styles.quickIconCircle}>
            <MaterialCommunityIcons name="video-outline" size={24} color={colors.primary} />
          </View>
          <Text style={styles.quickLabel}>Meetings</Text>
          <Text style={styles.quickSub}>Schedule & join</Text>
        </TouchableOpacity>
      </View>

      {/* 5. Recent Activity */}
      <View style={styles.activitySection}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <Card style={styles.activityCard} elevation="sm">
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
                  <MaterialCommunityIcons name={item.icon || 'clock-outline'} size={20} color={colors.primary} />
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
    paddingBottom: 36,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    marginTop: 4,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  greetingText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  userNameText: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    letterSpacing: -0.2,
  },
  userRoleSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 1,
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bellBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.borderLight,
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
    borderRadius: 3.5,
    backgroundColor: colors.primary,
  },
  avatarBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#c7d2fe',
  },
  avatarText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  salaryCard: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    ...shadows.md,
  },
  salaryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  salaryPeriodLabel: {
    fontSize: typography.sizes.xs,
    color: 'rgba(255, 255, 255, 0.95)',
    fontWeight: typography.weights.medium,
  },
  paidPill: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  paidPillText: {
    color: '#16a34a',
    fontSize: 12,
    fontWeight: typography.weights.bold,
  },
  salaryAmount: {
    fontSize: 32,
    fontWeight: typography.weights.bold,
    color: colors.white,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  salaryCreditedText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.82)',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    ...shadows.sm,
  },
  metricCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  metricIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricCardTitle: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  metricCardVal: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  metricCardValSub: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.normal,
    color: colors.textSecondary,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 22,
  },
  quickTile: {
    width: '31.5%',
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 4,
    alignItems: 'center',
    marginBottom: 4,
    ...shadows.sm,
  },
  quickIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickLabel: {
    fontSize: 12,
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
  activitySection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: 10,
  },
  activityCard: {
    backgroundColor: colors.bgCard,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    ...shadows.sm,
  },
  emptyActivityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  emptyActivityText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
    paddingBottom: 10,
    marginBottom: 10,
  },
  activityIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityTextContainer: {
    flex: 1,
  },
  activityTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  activitySub: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  activityTime: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
