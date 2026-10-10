import { useEffect, useState } from 'react';
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
import Badge from '../../components/common/Badge.jsx';
import Card from '../../components/common/Card.jsx';
import NotificationCenterModal from '../../components/common/NotificationCenterModal.jsx';
import ScreenWrapper from '../../components/common/ScreenWrapper.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { borderRadius, colors, shadows, typography } from '../../theme/index.js';
import { formatDate, greeting } from '../../utils/format.js';
import { initials } from '../../utils/roles.js';

export default function AdminHomeScreen({ navigation }) {
  const { user, company, logout } = useAuth();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifVisible, setNotifVisible] = useState(false);

  const fetchSummary = async () => {
    try {
      const res = await getTodaySummaryApi();
      setSummary(res?.data || null);
    } catch (err) {
      console.warn('Failed to fetch admin summary:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSummary();
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <ScreenWrapper
      contentContainerStyle={styles.container}
      scrollable
    >
      {/* Top Bar with Greeting & Company Info */}
      <View style={styles.topBar}>
        <View style={styles.greetingContainer}>
          <Text style={styles.greetingText}>{greeting()},</Text>
          <Text style={styles.userNameText}>{user?.name || 'Administrator'}</Text>
          <View style={styles.companyRow}>
            <Text style={styles.companyText}>{company?.name || 'My Organization'}</Text>
            <Badge label={company?.plan || 'Free Plan'} variant="primary" size="sm" style={styles.planBadge} />
          </View>
        </View>
        <View style={styles.topRightActions}>
          <TouchableOpacity
            style={styles.bellBtn}
            onPress={() => setNotifVisible(true)}
          >
            <MaterialCommunityIcons name="bell-outline" size={22} color={colors.text} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.avatarBtn}
            onPress={() => navigation.navigate('AdminSettings')}
          >
            <Text style={styles.avatarText}>{initials(user?.name || 'AD')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Date Header */}
      <View style={styles.dateHeader}>
        <Text style={styles.sectionTitle}>Today's Overview</Text>
        <Text style={styles.dateText}>{formatDate(new Date())}</Text>
      </View>

      {/* 4 Stat KPIs */}
      <View style={styles.statsGrid}>
        <Card style={styles.statCard} elevation="sm">
          <View style={[styles.statIconBadge, { backgroundColor: colors.successBg }]}>
            <MaterialCommunityIcons name="account-check" size={20} color={colors.success} />
          </View>
          <Text style={styles.statVal}>{summary?.presentCount ?? 0}</Text>
          <Text style={styles.statLabel}>Present</Text>
        </Card>

        <Card style={styles.statCard} elevation="sm">
          <View style={[styles.statIconBadge, { backgroundColor: colors.warningBg }]}>
            <MaterialCommunityIcons name="calendar-alert" size={20} color={colors.warning} />
          </View>
          <Text style={styles.statVal}>{summary?.onLeaveCount ?? 0}</Text>
          <Text style={styles.statLabel}>On Leave</Text>
        </Card>

        <Card style={styles.statCard} elevation="sm">
          <View style={[styles.statIconBadge, { backgroundColor: colors.dangerBg }]}>
            <MaterialCommunityIcons name="account-clock" size={20} color={colors.danger} />
          </View>
          <Text style={styles.statVal}>{summary?.notPunchedCount ?? 0}</Text>
          <Text style={styles.statLabel}>Not Punched</Text>
        </Card>

        <Card style={styles.statCard} elevation="sm">
          <View style={[styles.statIconBadge, { backgroundColor: colors.infoBg }]}>
            <MaterialCommunityIcons name="account-group" size={20} color={colors.info} />
          </View>
          <Text style={styles.statVal}>{summary?.totalStaff ?? 0}</Text>
          <Text style={styles.statLabel}>Total Staff</Text>
        </Card>
      </View>

      {/* Quick Action Navigation Buttons */}
      <Text style={styles.sectionTitle}>Management Modules</Text>
      <View style={styles.modulesList}>
        <TouchableOpacity
          style={styles.moduleRow}
          onPress={() => navigation.navigate('AdminStaff')}
          activeOpacity={0.7}
        >
          <View style={[styles.moduleIconCircle, { backgroundColor: '#e0e7ff' }]}>
            <MaterialCommunityIcons name="account-group-outline" size={22} color={colors.primary} />
          </View>
          <View style={styles.moduleInfo}>
            <Text style={styles.moduleTitle}>Staff Directory</Text>
            <Text style={styles.moduleDesc}>Add, edit, manage salaries & active status</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.moduleRow}
          onPress={() => navigation.navigate('AdminAttendance')}
          activeOpacity={0.7}
        >
          <View style={[styles.moduleIconCircle, { backgroundColor: '#fef3c7' }]}>
            <MaterialCommunityIcons name="clock-time-four-outline" size={22} color={colors.warning} />
          </View>
          <View style={styles.moduleInfo}>
            <Text style={styles.moduleTitle}>Daily Attendance & Reports</Text>
            <Text style={styles.moduleDesc}>Live logs, geofence punch status & daily history</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.moduleRow}
          onPress={() => navigation.navigate('AdminLeaves')}
          activeOpacity={0.7}
        >
          <View style={[styles.moduleIconCircle, { backgroundColor: '#dcfce7' }]}>
            <MaterialCommunityIcons name="calendar-check-outline" size={22} color={colors.success} />
          </View>
          <View style={styles.moduleInfo}>
            <Text style={styles.moduleTitle}>Leave Approvals</Text>
            <Text style={styles.moduleDesc}>Approve or reject employee leave requests</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.moduleRow}
          onPress={() => navigation.navigate('AdminPayroll')}
          activeOpacity={0.7}
        >
          <View style={[styles.moduleIconCircle, { backgroundColor: '#ecfdf5' }]}>
            <MaterialCommunityIcons name="calculator-variant-outline" size={22} color={colors.success} />
          </View>
          <View style={styles.moduleInfo}>
            <Text style={styles.moduleTitle}>Monthly Payroll & Slips</Text>
            <Text style={styles.moduleDesc}>Compute draft salaries, adjust deductions & finalize</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.moduleRow}
          onPress={() => navigation.navigate('AdminCorrections')}
          activeOpacity={0.7}
        >
          <View style={[styles.moduleIconCircle, { backgroundColor: '#fef3c7' }]}>
            <MaterialCommunityIcons name="timer-edit-outline" size={22} color={colors.warning} />
          </View>
          <View style={styles.moduleInfo}>
            <Text style={styles.moduleTitle}>Punch Fix Requests</Text>
            <Text style={styles.moduleDesc}>Review and approve missed punch corrections</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.moduleRow}
          onPress={() => navigation.navigate('AdminMeetings')}
          activeOpacity={0.7}
        >
          <View style={[styles.moduleIconCircle, { backgroundColor: '#e0f2fe' }]}>
            <MaterialCommunityIcons name="briefcase-outline" size={22} color={colors.info} />
          </View>
          <View style={styles.moduleInfo}>
            <Text style={styles.moduleTitle}>Field Visits & Meetings</Text>
            <Text style={styles.moduleDesc}>Schedule client visits, track GPS & view outcomes</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.moduleRow}
          onPress={() => navigation.navigate('AdminClients')}
          activeOpacity={0.7}
        >
          <View style={[styles.moduleIconCircle, { backgroundColor: '#fdf2f8' }]}>
            <MaterialCommunityIcons name="domain" size={22} color="#db2777" />
          </View>
          <View style={styles.moduleInfo}>
            <Text style={styles.moduleTitle}>Client Directory</Text>
            <Text style={styles.moduleDesc}>Manage client accounts, GPS & contacts</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.moduleRow}
          onPress={() => navigation.navigate('AdminBilling')}
          activeOpacity={0.7}
        >
          <View style={[styles.moduleIconCircle, { backgroundColor: '#f0fdf4' }]}>
            <MaterialCommunityIcons name="credit-card-outline" size={22} color={colors.success} />
          </View>
          <View style={styles.moduleInfo}>
            <Text style={styles.moduleTitle}>Plan & Billing</Text>
            <Text style={styles.moduleDesc}>Staff capacity, features & upgrade requests</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.moduleRow}
          onPress={() => navigation.navigate('AdminSettings')}
          activeOpacity={0.7}
        >
          <View style={[styles.moduleIconCircle, { backgroundColor: '#ede9fe' }]}>
            <MaterialCommunityIcons name="cog-outline" size={22} color={colors.chart1} />
          </View>
          <View style={styles.moduleInfo}>
            <Text style={styles.moduleTitle}>Company Settings & Geofence</Text>
            <Text style={styles.moduleDesc}>Configure office GPS coordinates, PF/ESI & plan</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

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
    paddingBottom: 32,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    marginTop: 8,
  },
  greetingContainer: {
    flex: 1,
  },
  greetingText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  userNameText: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  companyText: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
  },
  planBadge: {
    marginLeft: 8,
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bellBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  avatarBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  avatarText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.white,
  },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  dateText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    width: '48%',
    padding: 14,
    alignItems: 'flex-start',
  },
  statIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statVal: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  statLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  modulesList: {
    gap: 10,
  },
  moduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    padding: 16,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  moduleIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  moduleInfo: {
    flex: 1,
  },
  moduleTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  moduleDesc: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
