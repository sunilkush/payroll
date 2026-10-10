import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { getTodaySummaryApi } from '../../api/attendanceApi.js';
import { getDashboardApi } from '../../api/dashboardApi.js';
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
  greeting,
  monthLabel,
} from '../../utils/format.js';
import { initials } from '../../utils/roles.js';

export default function AdminHomeScreen({ navigation }) {
  const { user, company, logout } = useAuth();

  const [dashboardData, setDashboardData] = useState(null);
  const [todaySummary, setTodaySummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifVisible, setNotifVisible] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [dashRes, sumRes] = await Promise.allSettled([
        getDashboardApi({ days: 30 }),
        getTodaySummaryApi(),
      ]);

      if (dashRes.status === 'fulfilled') {
        setDashboardData(dashRes.value?.data || null);
      }
      if (sumRes.status === 'fulfilled') {
        setTodaySummary(sumRes.value?.data || null);
      }
    } catch (err) {
      console.warn('Failed to load admin dashboard:', err.message);
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

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  // Metrics extraction
  const today = dashboardData?.today || {
    totalStaff: todaySummary?.totalStaff ?? 0,
    present: todaySummary?.presentCount ?? 0,
    onLeave: todaySummary?.onLeaveCount ?? 0,
    notMarked: todaySummary?.notPunchedCount ?? 0,
  };

  const payrollKpi = dashboardData?.kpis?.payroll;
  const latestPayrollRow = (dashboardData?.payrollTrend || [])
    .filter((r) => r.generated)
    .at(-1);

  const netPayroll = latestPayrollRow?.net ?? payrollKpi?.value ?? 0;
  const totalDeductions = latestPayrollRow?.deductions ?? 0;
  const grossPayroll = netPayroll + totalDeductions;
  const payrollPeriod = payrollKpi?.label || monthLabel(new Date());
  const payrollStatus = payrollKpi?.status === 'DRAFT' ? 'Draft' : 'Finalized';

  const pendingLeavesList = dashboardData?.pendingLeaves || [];
  const pendingLeavesCount = dashboardData?.kpis?.pendingLeaves?.value ?? 0;
  const activityList = dashboardData?.activity || [];

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
          <Text style={styles.greetingText}>{greeting()},</Text>
          <Text style={styles.userNameText}>{user?.name || 'HR Admin'}</Text>
          <View style={styles.companyRow}>
            <Text style={styles.companyText}>{company?.name || 'Organization'}</Text>
            <Badge label={company?.plan || 'Standard'} variant="primary" size="sm" />
          </View>
        </View>

        <View style={styles.topRightActions}>
          <TouchableOpacity
            style={styles.bellBtn}
            onPress={() => setNotifVisible(true)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="bell-outline" size={22} color={colors.text} />
            {pendingLeavesCount > 0 && <View style={styles.notifDot} />}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.avatarBtn}
            onPress={() => navigation.navigate('AdminSettings')}
            activeOpacity={0.8}
          >
            <Text style={styles.avatarText}>{initials(user?.name || 'AD')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Monthly Payroll Summary FinTech Banner Card */}
      <View style={styles.payrollSummaryCard}>
        <View style={styles.payrollTopRow}>
          <View>
            <Text style={styles.payrollPeriodLabel}>{payrollPeriod} Payroll</Text>
            <Text style={styles.payrollSubtitle}>Monthly Net Disbursement</Text>
          </View>
          <Badge
            label={payrollStatus}
            variant={payrollStatus === 'Finalized' ? 'success' : 'warning'}
            size="sm"
          />
        </View>

        <Text style={styles.netPayrollAmount}>{formatCurrency(netPayroll)}</Text>

        {/* Gross vs Deductions breakdown */}
        <View style={styles.payrollMetricsRow}>
          <View style={styles.payrollMetricCol}>
            <Text style={styles.payrollMetricLabel}>Total Gross Salary</Text>
            <Text style={styles.payrollMetricVal}>{formatCurrency(grossPayroll)}</Text>
          </View>
          <View style={styles.payrollDivider} />
          <View style={styles.payrollMetricCol}>
            <Text style={styles.payrollMetricLabel}>Total Deductions (PF/ESI)</Text>
            <Text style={[styles.payrollMetricVal, { color: '#fca5a5' }]}>
              -{formatCurrency(totalDeductions)}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.payrollActionBtn}
          onPress={() => navigation.navigate('AdminPayroll')}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="calculator-variant-outline" size={16} color={colors.white} />
          <Text style={styles.payrollActionBtnText}>Manage & Process Payroll</Text>
          <MaterialCommunityIcons name="chevron-right" size={16} color={colors.white} />
        </TouchableOpacity>
      </View>

      {/* 3. Today's Workforce Attendance Overview */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Today's Attendance Overview</Text>
        <Text style={styles.sectionSubtitle}>{formatDate(new Date())}</Text>
      </View>

      <View style={styles.statsGrid}>
        {/* Present */}
        <TouchableOpacity
          style={[styles.statTile, { borderColor: '#bbf7d0' }]}
          onPress={() => navigation.navigate('AdminAttendance')}
          activeOpacity={0.7}
        >
          <View style={[styles.statIconBadge, { backgroundColor: colors.successBg }]}>
            <MaterialCommunityIcons name="account-check" size={20} color={colors.success} />
          </View>
          <Text style={[styles.statNumber, { color: colors.success }]}>{today.present}</Text>
          <Text style={styles.statLabel}>Present</Text>
        </TouchableOpacity>

        {/* On Leave */}
        <TouchableOpacity
          style={[styles.statTile, { borderColor: '#fde68a' }]}
          onPress={() => navigation.navigate('AdminLeaves')}
          activeOpacity={0.7}
        >
          <View style={[styles.statIconBadge, { backgroundColor: colors.warningBg }]}>
            <MaterialCommunityIcons name="calendar-alert" size={20} color={colors.warning} />
          </View>
          <Text style={[styles.statNumber, { color: colors.warning }]}>{today.onLeave}</Text>
          <Text style={styles.statLabel}>On Leave</Text>
        </TouchableOpacity>

        {/* Absent / Not Punched */}
        <TouchableOpacity
          style={[styles.statTile, { borderColor: '#fecaca' }]}
          onPress={() => navigation.navigate('AdminAttendance')}
          activeOpacity={0.7}
        >
          <View style={[styles.statIconBadge, { backgroundColor: colors.dangerBg }]}>
            <MaterialCommunityIcons name="account-clock" size={20} color={colors.danger} />
          </View>
          <Text style={[styles.statNumber, { color: colors.danger }]}>{today.notMarked}</Text>
          <Text style={styles.statLabel}>Absent / Unmarked</Text>
        </TouchableOpacity>

        {/* Total Active Staff */}
        <TouchableOpacity
          style={[styles.statTile, { borderColor: '#bfdbfe' }]}
          onPress={() => navigation.navigate('AdminStaff')}
          activeOpacity={0.7}
        >
          <View style={[styles.statIconBadge, { backgroundColor: colors.primaryBg }]}>
            <MaterialCommunityIcons name="account-group" size={20} color={colors.primary} />
          </View>
          <Text style={[styles.statNumber, { color: colors.primary }]}>{today.totalStaff}</Text>
          <Text style={styles.statLabel}>Total Staff</Text>
        </TouchableOpacity>
      </View>

      {/* 4. Pending Leave Approvals Section */}
      {pendingLeavesCount > 0 ? (
        <Card style={styles.pendingLeavesCard} elevation="sm">
          <View style={styles.pendingHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <MaterialCommunityIcons name="alert-circle-outline" size={20} color={colors.warning} />
              <Text style={styles.pendingTitle}>
                Leave Approvals ({pendingLeavesCount} Pending)
              </Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('AdminLeaves')}>
              <Text style={styles.viewAllText}>Review All</Text>
            </TouchableOpacity>
          </View>

          {pendingLeavesList.slice(0, 3).map((req) => (
            <View key={req._id} style={styles.leaveReqRow}>
              <View style={styles.leaveReqInfo}>
                <Text style={styles.leaveReqName}>{req.userId?.name || 'Staff Member'}</Text>
                <Text style={styles.leaveReqSub}>
                  {req.type} • {req.days} Day(s) • {formatDate(req.fromDate)}
                </Text>
              </View>
              <Button
                title="Review"
                size="sm"
                variant="outline"
                onPress={() => navigation.navigate('AdminLeaves')}
              />
            </View>
          ))}
        </Card>
      ) : null}

      {/* 5. HR Management Modules (Grid Navigation) */}
      <Text style={styles.sectionTitle}>HR & Payroll Modules</Text>
      <View style={styles.modulesGrid}>
        <TouchableOpacity
          style={styles.moduleCard}
          onPress={() => navigation.navigate('AdminStaff')}
          activeOpacity={0.7}
        >
          <View style={[styles.moduleIconCircle, { backgroundColor: colors.primaryBg }]}>
            <MaterialCommunityIcons name="account-group-outline" size={24} color={colors.primary} />
          </View>
          <Text style={styles.moduleTitle}>Staff Directory</Text>
          <Text style={styles.moduleDesc}>Employee profiles & salary</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.moduleCard}
          onPress={() => navigation.navigate('AdminPayroll')}
          activeOpacity={0.7}
        >
          <View style={[styles.moduleIconCircle, { backgroundColor: '#f0fdf4' }]}>
            <MaterialCommunityIcons name="wallet-outline" size={24} color={colors.success} />
          </View>
          <Text style={styles.moduleTitle}>Payroll Engine</Text>
          <Text style={styles.moduleDesc}>Calculate, draft & slips</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.moduleCard}
          onPress={() => navigation.navigate('AdminAttendance')}
          activeOpacity={0.7}
        >
          <View style={[styles.moduleIconCircle, { backgroundColor: '#fef3c7' }]}>
            <MaterialCommunityIcons name="clock-time-four-outline" size={24} color={colors.warning} />
          </View>
          <Text style={styles.moduleTitle}>Attendance</Text>
          <Text style={styles.moduleDesc}>Live logs & monthly matrix</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.moduleCard}
          onPress={() => navigation.navigate('AdminLeaves')}
          activeOpacity={0.7}
        >
          <View style={[styles.moduleIconCircle, { backgroundColor: '#eff6ff' }]}>
            <MaterialCommunityIcons name="calendar-check-outline" size={24} color={colors.info} />
          </View>
          <Text style={styles.moduleTitle}>Leaves</Text>
          <Text style={styles.moduleDesc}>CL / EL requests & rules</Text>
        </TouchableOpacity>
      </View>

      {/* 6. Recent Workforce Activity Stream */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Workforce Activity Feed</Text>
      </View>

      <Card style={styles.activityCard} elevation="sm">
        {activityList.length === 0 ? (
          <View style={styles.emptyFeed}>
            <MaterialCommunityIcons name="timeline-clock-outline" size={32} color={colors.textMuted} />
            <Text style={styles.emptyFeedText}>No workforce activity logged today.</Text>
          </View>
        ) : (
          activityList.slice(0, 5).map((act, idx) => (
            <View
              key={act.at + idx}
              style={[
                styles.activityItem,
                idx < Math.min(activityList.length, 5) - 1 && styles.activityBorder,
              ]}
            >
              <View
                style={[
                  styles.activityIconCircle,
                  {
                    backgroundColor: act.type?.includes('PUNCH')
                      ? colors.successBg
                      : colors.primaryBg,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name={act.type?.includes('PUNCH') ? 'clock-check' : 'file-document'}
                  size={16}
                  color={act.type?.includes('PUNCH') ? colors.success : colors.primary}
                />
              </View>
              <View style={styles.activityInfo}>
                <Text style={styles.activityText}>{act.text}</Text>
                {act.detail ? <Text style={styles.activityDetail}>{act.detail}</Text> : null}
              </View>
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
    backgroundColor: colors.danger,
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
  payrollSummaryCard: {
    backgroundColor: colors.primaryDark,
    borderRadius: borderRadius.xl,
    padding: 20,
    marginBottom: 18,
    ...shadows.md,
  },
  payrollTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  payrollPeriodLabel: {
    fontSize: typography.sizes.xs,
    color: '#93c5fd',
    fontWeight: typography.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  payrollSubtitle: {
    fontSize: typography.sizes.sm,
    color: '#e2e8f0',
    marginTop: 2,
  },
  netPayrollAmount: {
    fontSize: typography.sizes.xxxl,
    fontWeight: typography.weights.bold,
    color: colors.white,
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  payrollMetricsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: borderRadius.md,
    padding: 10,
    marginBottom: 14,
  },
  payrollMetricCol: {
    flex: 1,
  },
  payrollMetricLabel: {
    fontSize: 10,
    color: '#bfdbfe',
    marginBottom: 2,
  },
  payrollMetricVal: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.white,
  },
  payrollDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 10,
  },
  payrollActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingVertical: 9,
    borderRadius: borderRadius.md,
    gap: 6,
  },
  payrollActionBtnText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.white,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  sectionSubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 18,
  },
  statTile: {
    width: '48.5%',
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: 14,
    ...shadows.sm,
  },
  statIconBadge: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  pendingLeavesCard: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
    padding: 14,
    marginBottom: 18,
  },
  pendingHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  pendingTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.warning,
  },
  viewAllText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
  },
  leaveReqRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.md,
    padding: 10,
    marginBottom: 6,
  },
  leaveReqInfo: {
    flex: 1,
  },
  leaveReqName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  leaveReqSub: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  modulesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
    marginTop: 10,
  },
  moduleCard: {
    width: '48.5%',
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    ...shadows.sm,
  },
  moduleIconCircle: {
    width: 42,
    height: 42,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  moduleTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  moduleDesc: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  activityCard: {
    padding: 12,
  },
  emptyFeed: {
    alignItems: 'center',
    paddingVertical: 18,
    gap: 6,
  },
  emptyFeedText: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  activityBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  activityIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  activityInfo: {
    flex: 1,
  },
  activityText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  activityDetail: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1,
  },
});
