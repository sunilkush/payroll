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
import { listPayrollApi } from '../../api/payrollApi.js';
import Avatar from '../../components/common/Avatar.jsx';
import Badge from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import Loader from '../../components/common/Loader.jsx';
import NotificationCenterModal from '../../components/common/NotificationCenterModal.jsx';
import ScreenWrapper from '../../components/common/ScreenWrapper.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { borderRadius, colors, radius, shadows, spacing, typography } from '../../theme/index.js';
import {
  currentMonth,
  formatCurrency,
  formatDate,
  formatMonth,
  greeting,
} from '../../utils/format.js';
import { initials } from '../../utils/roles.js';

export default function AdminHomeScreen({ navigation }) {
  const { user, company, logout } = useAuth();

  const [dashboardData, setDashboardData] = useState(null);
  const [todaySummary, setTodaySummary] = useState(null);
  const [currentPayroll, setCurrentPayroll] = useState(null);
  const [selectedMonthIdx, setSelectedMonthIdx] = useState(5);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifVisible, setNotifVisible] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [dashRes, sumRes, payrollRes] = await Promise.allSettled([
        getDashboardApi({ days: 30 }),
        getTodaySummaryApi(),
        listPayrollApi(currentMonth()),
      ]);

      if (dashRes.status === 'fulfilled') {
        setDashboardData(dashRes.value?.data || null);
      }
      if (sumRes.status === 'fulfilled') {
        setTodaySummary(sumRes.value?.data || null);
      }
      if (payrollRes.status === 'fulfilled') {
        setCurrentPayroll(payrollRes.value?.data || null);
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

  // Dynamic Metrics extraction
  const curMonthStr = currentMonth();
  const totalEmployeesCount = dashboardData?.kpis?.employees?.value ?? todaySummary?.totalStaff ?? 0;
  const activeStaffCount = todaySummary?.presentCount !== undefined ? todaySummary.presentCount : (dashboardData?.kpis?.employees?.active ?? 0);

  // Dynamic 6-Month Payroll Trend from backend MongoDB
  const now = new Date();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const rawTrend = dashboardData?.payrollTrend || [];

  const sixMonths = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = monthNames[d.getMonth()];

    // Live priority for current month if active in currentPayroll
    if (period === curMonthStr && currentPayroll?.totals && currentPayroll.rows?.length > 0) {
      const net = Number(currentPayroll.totals.netSalary) || 0;
      const deductions = Number(currentPayroll.totals.deductions) || 0;
      const employer = Number(currentPayroll.totals.employerContribution) || 0;
      const gross = Number(currentPayroll.totals.earnedGross) || (net + deductions);
      return {
        period,
        label,
        net,
        deductions,
        employer,
        gross,
        generated: true,
        hasDraft: Boolean(currentPayroll.hasDraft),
        staffCount: currentPayroll.rows.length,
      };
    }

    const found = rawTrend.find((t) => t.period === period);
    if (found && found.generated) {
      const net = Number(found.net) || 0;
      const deductions = Number(found.deductions) || 0;
      const employer = Number(found.employer) || 0;
      const gross = net + deductions;
      return {
        period,
        label: found.label || label,
        net,
        deductions,
        employer,
        gross,
        generated: true,
        hasDraft: false,
        staffCount: 0,
      };
    }

    return {
      period,
      label,
      net: 0,
      deductions: 0,
      employer: 0,
      gross: 0,
      generated: false,
      hasDraft: false,
      staffCount: 0,
    };
  });

  // Scale computation for strictly proportional bars
  const maxMonthVal = Math.max(...sixMonths.map((m) => m.gross || 0), 1);

  // Active / Latest payroll metrics for the top cards
  const latestGenerated = [...sixMonths].reverse().find((m) => m.generated && m.gross > 0) || null;
  const activePayrollItem = (sixMonths[5]?.generated && sixMonths[5]?.gross > 0) ? sixMonths[5] : latestGenerated;

  const activeNet = activePayrollItem?.net || 0;
  const activeGross = activePayrollItem?.gross || 0;
  const activeDeductions = activePayrollItem?.deductions || 0;
  const activePeriodLabel = activePayrollItem ? formatMonth(activePayrollItem.period) : formatMonth(curMonthStr);
  const activeStatus = activePayrollItem ? (activePayrollItem.hasDraft ? 'Draft' : activePayrollItem.generated ? 'Finalized' : 'Not Run') : 'Not Run';
  const activeStatusVariant = activeStatus === 'Finalized' ? 'success' : activeStatus === 'Draft' ? 'warning' : 'default';

  const payrollKpi = dashboardData?.kpis?.payroll;
  const changePercent = payrollKpi?.changePercent;
  const selectedMonth = sixMonths[selectedMonthIdx] || sixMonths[5];

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
          <Text style={styles.roleSubtext}>HR Admin</Text>
          <Text style={styles.greetingText}>{greeting()}</Text>
        </View>

        <View style={styles.topRightActions}>
          <TouchableOpacity
            style={styles.bellBtn}
            onPress={() => setNotifVisible(true)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="bell-outline" size={20} color={colors.text} />
            {pendingLeavesCount > 0 && <View style={styles.notifDot} />}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('AdminProfile')}
            activeOpacity={0.8}
          >
            <Avatar name={user?.name || 'HR'} size={36} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.logoutTopBtn}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="logout" size={18} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Today's Workforce Attendance Pulse (Compact 4-Pill Matrix) */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => navigation.navigate('AdminAttendance')}
      >
        <Card style={styles.attendancePulseCard} elevation="xs">
          <View style={styles.pulseHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={styles.livePulseDot} />
              <Text style={styles.pulseTitle}>Today's Attendance</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <Text style={styles.pulseDateText}>{formatDate(new Date())}</Text>
              <MaterialCommunityIcons name="chevron-right" size={14} color={colors.textSecondary} />
            </View>
          </View>

          <View style={styles.pulseMetricsRow}>
            <View style={styles.pulseMetricItem}>
              <View style={[styles.pulseIconCircle, { backgroundColor: '#EFF6FF' }]}>
                <MaterialCommunityIcons name="account-group" size={14} color={colors.primary} />
              </View>
              <Text style={styles.pulseNumberBlue}>{totalEmployeesCount}</Text>
              <Text style={styles.pulseLabel}>Staff</Text>
            </View>

            <View style={styles.pulseDivider} />

            <View style={styles.pulseMetricItem}>
              <View style={[styles.pulseIconCircle, { backgroundColor: '#DCFCE7' }]}>
                <MaterialCommunityIcons name="account-check" size={14} color="#16A34A" />
              </View>
              <Text style={styles.pulseNumberGreen}>
                {todaySummary?.presentCount ?? activeStaffCount}
              </Text>
              <Text style={styles.pulseLabel}>Present</Text>
            </View>

            <View style={styles.pulseDivider} />

            <View style={styles.pulseMetricItem}>
              <View style={[styles.pulseIconCircle, { backgroundColor: '#FEF3C7' }]}>
                <MaterialCommunityIcons name="account-clock" size={14} color="#D97706" />
              </View>
              <Text style={styles.pulseNumberAmber}>
                {todaySummary?.leaveCount ?? 0}
              </Text>
              <Text style={styles.pulseLabel}>On Leave</Text>
            </View>

            <View style={styles.pulseDivider} />

            <View style={styles.pulseMetricItem}>
              <View style={[styles.pulseIconCircle, { backgroundColor: '#FEE2E2' }]}>
                <MaterialCommunityIcons name="account-alert" size={14} color="#DC2626" />
              </View>
              <Text style={styles.pulseNumberRed}>
                {todaySummary?.notMarked ?? Math.max(0, totalEmployeesCount - activeStaffCount)}
              </Text>
              <Text style={styles.pulseLabel}>Not Marked</Text>
            </View>
          </View>
        </Card>
      </TouchableOpacity>

      {/* 3. Net Payroll & Financial Summary (Compact All-in-One Card) */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => navigation.navigate('AdminPayroll')}
      >
        <Card style={styles.netPayrollCard} elevation="xs">
          <View style={styles.netPayrollTopRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <MaterialCommunityIcons name="wallet" size={16} color={colors.primary} />
              <Text style={styles.netPayrollTitle}>Net Payroll • {activePeriodLabel}</Text>
            </View>
            <Badge label={activeStatus} variant={activeStatusVariant} size="sm" />
          </View>

          <View style={styles.netPayrollAmountRow}>
            <Text style={styles.netPayrollAmount}>{formatCurrency(activeNet)}</Text>
            {changePercent !== null && changePercent !== undefined && (
              <View style={[styles.changeBadge, changePercent >= 0 ? styles.changeUp : styles.changeDown]}>
                <MaterialCommunityIcons
                  name={changePercent >= 0 ? 'arrow-top-right' : 'arrow-bottom-right'}
                  size={12}
                  color={changePercent >= 0 ? '#166534' : '#991B1B'}
                />
                <Text style={[styles.changeText, { color: changePercent >= 0 ? '#166534' : '#991B1B' }]}>
                  {Math.abs(changePercent)}%
                </Text>
              </View>
            )}
          </View>

          <View style={styles.netPayrollFooter}>
            <View style={styles.netPayrollSubStats}>
              <Text style={styles.netPayrollSubLabel}>
                Gross: <Text style={styles.netPayrollSubVal}>{formatCurrency(activeGross)}</Text>
              </Text>
              <Text style={styles.netPayrollSubDot}>•</Text>
              <Text style={styles.netPayrollSubLabel}>
                Deduct: <Text style={styles.netPayrollSubVal}>{formatCurrency(activeDeductions)}</Text>
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <Text style={styles.viewPayrollLink}>Payroll Hub</Text>
              <MaterialCommunityIcons name="chevron-right" size={14} color={colors.primary} />
            </View>
          </View>
        </Card>
      </TouchableOpacity>

      {/* 4. Operations & Services Hub (Compact 4-Column Grid) */}
      <View style={styles.hubSection}>
        <Text style={styles.sectionTitle}>Operations & Services</Text>
        <View style={styles.hubGrid}>
          {[
            { label: 'Employees', icon: 'account-group', route: 'AdminStaff', color: '#2563EB', bg: '#EFF6FF' },
            { label: 'Attendance', icon: 'calendar-check', route: 'AdminAttendance', color: '#16A34A', bg: '#DCFCE7' },
            { label: 'Payroll', icon: 'wallet', route: 'AdminPayroll', color: '#7C3AED', bg: '#F3E8FF' },
            { label: 'Leaves', icon: 'calendar-clock', route: 'AdminLeaves', color: '#D97706', bg: '#FEF3C7' },
            { label: 'Corrections', icon: 'clock-edit-outline', route: 'AdminCorrections', color: '#0284C7', bg: '#E0F2FE' },
            { label: 'Reports', icon: 'file-chart-outline', route: 'AdminReports', color: '#4F46E5', bg: '#EEF2FF' },
            { label: 'Clients', icon: 'account-tie', route: 'AdminClients', color: '#0D9488', bg: '#CCFBF1' },
            { label: 'Billing', icon: 'receipt', route: 'AdminBilling', color: '#EA580C', bg: '#FFEDD5' },
            { label: 'Meetings', icon: 'video-account', route: 'AdminMeetings', color: '#2563EB', bg: '#DBEAFE' },
            { label: 'Settings', icon: 'cog-outline', route: 'AdminSettings', color: '#475569', bg: '#F1F5F9' },
            { label: 'Profile', icon: 'account-cog-outline', route: 'AdminProfile', color: '#0284C7', bg: '#E0F2FE' },
          ].map((item) => (
            <TouchableOpacity
              key={item.label}
              style={styles.hubTile}
              onPress={() => navigation.navigate(item.route)}
              activeOpacity={0.7}
            >
              <View style={[styles.hubIconWrap, { backgroundColor: item.bg }]}>
                <MaterialCommunityIcons name={item.icon} size={20} color={item.color} />
              </View>
              <Text style={styles.hubLabel} numberOfLines={1}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* 5. Dynamic Payroll Overview 6 Months Bar Chart */}
      <Card style={styles.chartCard} elevation="xs">
        <View style={styles.chartHeaderRow}>
          <View>
            <Text style={styles.chartTitle}>Payroll Overview</Text>
            <Text style={styles.chartSubtitle}>Last 6 Months (Tap bar to inspect)</Text>
          </View>

          <TouchableOpacity
            style={styles.runPayrollBtn}
            onPress={() => navigation.navigate('AdminPayroll')}
            activeOpacity={0.7}
          >
            <Text style={styles.runPayrollText}>Open Payroll</Text>
            <MaterialCommunityIcons name="arrow-right" size={14} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Legend */}
        <View style={styles.chartLegendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
            <Text style={styles.legendText}>Net Salary</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
            <Text style={styles.legendText}>Deductions (PF/ESI)</Text>
          </View>
        </View>

        {/* 6 Months Bar Visualization */}
        <View style={styles.barsContainer}>
          {sixMonths.map((item, idx) => {
            const isSelected = selectedMonthIdx === idx;
            const gross = item.gross || 0;
            const hasData = item.generated && gross > 0;
            const heightPct = hasData ? Math.min(100, Math.max(16, Math.round((gross / maxMonthVal) * 100))) : 8;
            const netRatio = gross > 0 ? (item.net / gross) : 1;
            const deductRatio = 1 - netRatio;

            return (
              <TouchableOpacity
                key={item.period}
                style={[styles.barCol, isSelected && styles.barColSelected]}
                onPress={() => setSelectedMonthIdx(idx)}
                activeOpacity={0.7}
              >
                <View style={styles.barTrackWrap}>
                  <View
                    style={[
                      styles.barTrack,
                      { height: `${heightPct}%` },
                      !hasData && styles.barTrackEmpty,
                      isSelected && styles.barTrackSelected,
                    ]}
                  >
                    {hasData ? (
                      <>
                        {item.deductions > 0 && (
                          <View
                            style={[
                              styles.barSegmentDeductions,
                              { flex: deductRatio },
                            ]}
                          />
                        )}
                        <View
                          style={[
                            styles.barSegmentNet,
                            { flex: netRatio },
                          ]}
                        />
                      </>
                    ) : (
                      <View style={styles.barPlaceholderDash} />
                    )}
                  </View>
                </View>
                <Text style={[styles.barLabel, isSelected && styles.barLabelSelected]}>
                  {item.label}
                </Text>
                {isSelected && <View style={styles.selectedDot} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Interactive Selected Month Breakdown Card */}
        <View style={styles.selectedMonthCard}>
          <View style={styles.selectedMonthHeader}>
            <View>
              <Text style={styles.selectedMonthTitle}>
                {formatMonth(selectedMonth.period)}
              </Text>
              <Text style={styles.selectedMonthPeriod}>{selectedMonth.period}</Text>
            </View>
            <Badge
              label={
                selectedMonth.generated
                  ? selectedMonth.hasDraft
                    ? 'Draft'
                    : 'Finalized'
                  : 'Not Generated'
              }
              variant={
                selectedMonth.generated
                  ? selectedMonth.hasDraft
                    ? 'warning'
                    : 'success'
                  : 'default'
              }
              size="sm"
            />
          </View>

          {selectedMonth.generated && selectedMonth.gross > 0 ? (
            <View style={styles.monthMetricsGrid}>
              <View style={styles.monthMetricCol}>
                <Text style={styles.monthMetricLabel}>Net Disbursed</Text>
                <Text style={styles.monthMetricValuePrimary}>{formatCurrency(selectedMonth.net)}</Text>
              </View>
              <View style={styles.monthMetricCol}>
                <Text style={styles.monthMetricLabel}>Total Gross</Text>
                <Text style={styles.monthMetricValue}>{formatCurrency(selectedMonth.gross)}</Text>
              </View>
              <View style={styles.monthMetricCol}>
                <Text style={styles.monthMetricLabel}>Deductions</Text>
                <Text style={styles.monthMetricValueAmber}>{formatCurrency(selectedMonth.deductions)}</Text>
              </View>
              <View style={styles.monthMetricCol}>
                <Text style={styles.monthMetricLabel}>Employer Share</Text>
                <Text style={styles.monthMetricValue}>{formatCurrency(selectedMonth.employer || 0)}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.noDataRow}>
              <MaterialCommunityIcons name="information-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.noDataText}>
                No payroll generated for this period.
              </Text>
              <TouchableOpacity
                style={styles.quickGenBtn}
                onPress={() => navigation.navigate('AdminPayroll')}
              >
                <Text style={styles.quickGenBtnText}>Generate Now</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Card>

      {/* 6. Pending Leave Approvals Section */}
      {pendingLeavesCount > 0 ? (
        <Card style={styles.pendingLeavesCard} elevation="xs">
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

      {/* 7. Workforce Activity Feed */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Workforce Activity Feed</Text>
      </View>

      <Card style={styles.activityCard} elevation="xs">
        {activityList.length === 0 ? (
          <View style={styles.emptyFeed}>
            <MaterialCommunityIcons name="timeline-clock-outline" size={32} color={colors.textSecondary} />
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
                      ? '#DCFCE7'
                      : '#EFF6FF',
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name={act.type?.includes('PUNCH') ? 'clock-check' : 'file-document'}
                  size={16}
                  color={act.type?.includes('PUNCH') ? '#16A34A' : '#2563EB'}
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
    paddingBottom: 24,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 2,
  },
  greetingContainer: {
    flex: 1,
  },
  roleSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  greetingText: {
    fontSize: 19,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
    marginTop: 1,
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bellBtn: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.pill,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notifDot: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#DC2626',
  },
  avatarBtn: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.pill,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: typography.weights.bold,
    fontSize: 13,
  },
  logoutTopBtn: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.pill,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // 2-column metrics cards
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    justifyContent: 'center',
    ...shadows.xs,
  },
  statCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  statNumberBlue: {
    fontSize: 18,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  statNumberDark: {
    fontSize: 16,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
  },
  statPeriodSub: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },

  // Today Attendance Pulse
  attendancePulseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.xs,
  },
  pulseHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  livePulseDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#16A34A',
  },
  pulseTitle: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
  },
  pulseDateText: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  pulseMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  pulseMetricItem: {
    alignItems: 'center',
    flex: 1,
  },
  pulseIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },
  pulseNumberGreen: {
    fontSize: 16,
    fontWeight: typography.weights.bold,
    color: colors.success,
  },
  pulseNumberAmber: {
    fontSize: 16,
    fontWeight: typography.weights.bold,
    color: colors.warning,
  },
  pulseNumberRed: {
    fontSize: 16,
    fontWeight: typography.weights.bold,
    color: colors.error,
  },
  pulseLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },
  pulseDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
  },

  // Full-width Net Payroll Card
  netPayrollCard: {
    padding: 10,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
    backgroundColor: colors.card,
    ...shadows.xs,
  },
  netPayrollTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  netPayrollTitle: {
    fontSize: 12,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
  },
  netPayrollAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  netPayrollAmount: {
    fontSize: 22,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.pill,
  },
  changeUp: {
    backgroundColor: colors.successContainer,
  },
  changeDown: {
    backgroundColor: colors.errorContainer,
  },
  changeText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
  netPayrollFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
  },
  netPayrollSubStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  netPayrollSubLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  netPayrollSubVal: {
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  netPayrollSubDot: {
    fontSize: 9,
    color: colors.textMuted,
  },
  netPayrollHint: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  viewPayrollLink: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },

  // Operations Hub
  hubSection: {
    marginBottom: 12,
  },
  hubGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 6,
    marginTop: 6,
  },
  hubTile: {
    width: '23%',
    minWidth: 54,
    alignItems: 'center',
    marginBottom: 6,
  },
  hubIconWrap: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hubLabel: {
    fontSize: 11,
    fontWeight: typography.weights.medium,
    color: colors.text,
    textAlign: 'center',
  },

  // Bar Chart Card
  chartCard: {
    padding: 10,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
    backgroundColor: colors.card,
    ...shadows.xs,
  },
  chartHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
  },
  chartSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  runPayrollBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  runPayrollText: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  chartLegendRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  barsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 100,
    paddingTop: 4,
    paddingHorizontal: 4,
    backgroundColor: colors.background,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  barCol: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: 2,
    borderRadius: radius.control,
  },
  barColSelected: {
    backgroundColor: colors.primaryLight,
  },
  barTrackWrap: {
    width: '100%',
    height: 64,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  barTrack: {
    width: 18,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barTrackEmpty: {
    backgroundColor: colors.border,
    height: 4,
    borderRadius: 2,
  },
  barTrackSelected: {
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  barSegmentDeductions: {
    width: '100%',
    backgroundColor: colors.warning,
  },
  barSegmentNet: {
    width: '100%',
    backgroundColor: colors.primary,
  },
  barPlaceholderDash: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.outline,
  },
  barLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 4,
    fontWeight: typography.weights.medium,
  },
  barLabelSelected: {
    color: colors.primary,
    fontWeight: typography.weights.bold,
  },
  selectedDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
    marginTop: 1,
  },
  selectedMonthCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 8,
  },
  selectedMonthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  selectedMonthTitle: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  selectedMonthPeriod: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },
  monthMetricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  monthMetricCol: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.sm,
    padding: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  monthMetricLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginBottom: 1,
  },
  monthMetricValue: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
  },
  monthMetricValuePrimary: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  monthMetricValueAmber: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
    color: '#D97706',
  },
  noDataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  noDataText: {
    fontSize: 11,
    color: colors.textSecondary,
    flex: 1,
    marginLeft: 6,
  },
  quickGenBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary,
  },
  quickGenBtnText: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: '#FFFFFF',
  },

  // Pending Leaves Card
  pendingLeavesCard: {
    padding: 10,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  pendingHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pendingTitle: {
    fontSize: 13,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
  },
  viewAllText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: typography.weights.semibold,
  },
  leaveReqRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  leaveReqInfo: {
    flex: 1,
  },
  leaveReqName: {
    fontSize: 13,
    fontWeight: typography.weights.semibold,
    color: '#0F172A',
  },
  leaveReqSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },

  // Activity stream
  sectionHeaderRow: {
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
  },
  activityCard: {
    padding: 10,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyFeed: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  emptyFeedText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  activityBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  activityIconCircle: {
    width: 26,
    height: 26,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  activityInfo: {
    flex: 1,
  },
  activityText: {
    fontSize: 12,
    fontWeight: typography.weights.medium,
    color: '#0F172A',
  },
  activityDetail: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
});
