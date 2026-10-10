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

  // Dynamic Metrics extraction
  const totalEmployeesCount = dashboardData?.kpis?.employees?.value ?? todaySummary?.totalStaff ?? 0;
  const activeStaffCount = todaySummary?.presentCount !== undefined ? todaySummary.presentCount : (dashboardData?.kpis?.employees?.active ?? 0);

  const payrollKpi = dashboardData?.kpis?.payroll;
  const latestPayrollRow = (dashboardData?.payrollTrend || [])
    .filter((r) => r.generated)
    .at(-1);

  const netPayroll = latestPayrollRow?.net ?? payrollKpi?.value ?? 0;
  const totalDeductions = latestPayrollRow?.deductions ?? 0;
  const grossPayroll = (netPayroll + totalDeductions) || (latestPayrollRow?.gross ?? 0);

  const pendingLeavesList = dashboardData?.pendingLeaves || [];
  const pendingLeavesCount = dashboardData?.kpis?.pendingLeaves?.value ?? 0;
  const activityList = dashboardData?.activity || [];

  // Dynamic 6-month chart derived from current date and actual trend
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();
  const currentMonthIdx = now.getMonth();
  const chartMonths = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), currentMonthIdx - 5 + i, 1);
    const mLabel = monthNames[d.getMonth()];
    const trendItem = (dashboardData?.payrollTrend || []).find((t) =>
      t.month?.toLowerCase().includes(mLabel.toLowerCase()) || t.label?.startsWith(mLabel)
    );
    const value = trendItem?.net ? Math.min(1, Math.max(0.25, trendItem.net / (grossPayroll || 1))) : 0.4 + (i * 0.1);
    return { label: mLabel, value };
  });

  return (
    <ScreenWrapper
      contentContainerStyle={styles.container}
      scrollable
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      {/* 1. Header with Greeting & Avatar matching Screen 1 */}
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
            <MaterialCommunityIcons name="bell-outline" size={24} color={colors.text} />
            {pendingLeavesCount > 0 && <View style={styles.notifDot} />}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.avatarBtn}
            onPress={() => navigation.navigate('AdminSettings')}
            activeOpacity={0.8}
          >
            <Text style={styles.avatarText}>{initials(user?.name || 'HA')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Top Stats Grid matching Screen 1 */}
      <View style={styles.statsGrid}>
        {/* Total Employees */}
        <TouchableOpacity
          style={styles.statCard}
          onPress={() => navigation.navigate('AdminStaff')}
          activeOpacity={0.8}
        >
          <Text style={styles.statLabel}>Total Employees</Text>
          <Text style={styles.statNumberBlue}>{totalEmployeesCount}</Text>
        </TouchableOpacity>

        {/* Active Staff */}
        <TouchableOpacity
          style={styles.statCard}
          onPress={() => navigation.navigate('AdminAttendance')}
          activeOpacity={0.8}
        >
          <Text style={styles.statLabel}>Active Staff</Text>
          <Text style={styles.statNumberBlue}>{activeStaffCount}</Text>
        </TouchableOpacity>
      </View>

      {/* 3. Financial Stats Grid */}
      <View style={styles.statsGrid}>
        {/* Total Gross */}
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total Gross</Text>
          <Text style={styles.statNumberDark}>{formatCurrency(grossPayroll)}</Text>
        </View>

        {/* Total Deductions */}
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total Deductions</Text>
          <Text style={styles.statNumberDark}>{formatCurrency(totalDeductions)}</Text>
        </View>
      </View>

      {/* 4. Net Payroll Card (Full Width) */}
      <Card style={styles.netPayrollCard} elevation="xs">
        <Text style={styles.statLabel}>Net Payroll</Text>
        <Text style={styles.netPayrollAmount}>{formatCurrency(netPayroll)}</Text>
      </Card>

      {/* Operations Hub (All Action Icons Prominently Visible) */}
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
          ].map((item) => (
            <TouchableOpacity
              key={item.label}
              style={styles.hubTile}
              onPress={() => navigation.navigate(item.route)}
              activeOpacity={0.7}
            >
              <View style={[styles.hubIconWrap, { backgroundColor: item.bg }]}>
                <MaterialCommunityIcons name={item.icon} size={22} color={item.color} />
              </View>
              <Text style={styles.hubLabel} numberOfLines={1}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* 5. Payroll Overview 6 Months Bar Chart matching Screen 1 */}
      <Card style={styles.chartCard} elevation="xs">
        <View style={styles.chartHeaderRow}>
          <Text style={styles.chartTitle}>Payroll Overview</Text>
          <Text style={styles.chartSubtitle}>Last 6 Months</Text>
        </View>

        <View style={styles.barsContainer}>
          {chartMonths.map((item) => (
            <View key={item.label} style={styles.barCol}>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { height: `${item.value * 100}%` }]} />
              </View>
              <Text style={styles.barLabel}>{item.label}</Text>
            </View>
          ))}
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
    paddingBottom: 36,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 4,
  },
  greetingContainer: {
    flex: 1,
  },
  roleSubtext: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  greetingText: {
    fontSize: 22,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
    marginTop: 2,
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bellBtn: {
    width: 42,
    height: 42,
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
    top: 9,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#DC2626',
  },
  avatarBtn: {
    width: 42,
    height: 42,
    borderRadius: borderRadius.pill,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: typography.weights.bold,
    fontSize: 15,
  },

  // 2-column metrics cards
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    justifyContent: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  statNumberBlue: {
    fontSize: 22,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  statNumberDark: {
    fontSize: 17,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
  },

  // Full-width Net Payroll Card
  netPayrollCard: {
    padding: 18,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  netPayrollAmount: {
    fontSize: 26,
    fontWeight: typography.weights.bold,
    color: colors.primary,
    marginTop: 4,
  },

  // Operations Hub
  hubSection: {
    marginBottom: 22,
  },
  hubGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 10,
  },
  hubTile: {
    width: '18%',
    minWidth: 62,
    alignItems: 'center',
    marginBottom: 10,
  },
  hubIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  hubLabel: {
    fontSize: 12,
    fontWeight: typography.weights.medium,
    color: '#334155',
    textAlign: 'center',
  },

  // Bar Chart Card
  chartCard: {
    padding: 18,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  chartHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
  },
  chartSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  barsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    paddingTop: 10,
    paddingHorizontal: 8,
  },
  barCol: {
    alignItems: 'center',
    flex: 1,
  },
  barTrack: {
    width: 22,
    height: 85,
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: 6,
  },
  barLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 8,
  },

  // Pending Leaves Card
  pendingLeavesCard: {
    padding: 16,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  pendingHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pendingTitle: {
    fontSize: 15,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
  },
  viewAllText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: typography.weights.semibold,
  },
  leaveReqRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  leaveReqInfo: {
    flex: 1,
  },
  leaveReqName: {
    fontSize: 14,
    fontWeight: typography.weights.semibold,
    color: '#0F172A',
  },
  leaveReqSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // Activity stream
  sectionHeaderRow: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
  },
  activityCard: {
    padding: 16,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyFeed: {
    alignItems: 'center',
    paddingVertical: 18,
  },
  emptyFeedText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 6,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  activityBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  activityIconCircle: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  activityInfo: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    fontWeight: typography.weights.medium,
    color: '#0F172A',
  },
  activityDetail: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
});
