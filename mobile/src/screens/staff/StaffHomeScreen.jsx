import { useEffect, useState } from 'react';
import {
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { getTodayApi } from '../../api/attendanceApi.js';
import Badge from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import ScreenWrapper from '../../components/common/ScreenWrapper.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { borderRadius, colors, shadows, typography } from '../../theme/index.js';
import { formatDate, formatTime, greeting, todayLocal } from '../../utils/format.js';
import { initials } from '../../utils/roles.js';

export default function StaffHomeScreen({ navigation }) {
  const { user, company, logout } = useAuth();
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchToday = async () => {
    try {
      const res = await getTodayApi();
      setTodayAttendance(res?.data || null);
    } catch (err) {
      console.warn('Failed to fetch today attendance:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchToday();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchToday();
  };

  const isPunchedIn = Boolean(todayAttendance?.punchIn?.time);
  const isPunchedOut = Boolean(todayAttendance?.punchOut?.time);

  const getStatusBadge = () => {
    if (isPunchedOut) return { label: 'Completed', variant: 'success' };
    if (isPunchedIn) return { label: 'Punched In (Active)', variant: 'primary' };
    return { label: 'Not Punched Today', variant: 'warning' };
  };

  const status = getStatusBadge();

  return (
    <ScreenWrapper
      contentContainerStyle={styles.container}
      scrollable
    >
      {/* Top Bar with Profile Greeting */}
      <View style={styles.topBar}>
        <View style={styles.greetingContainer}>
          <Text style={styles.greetingText}>{greeting()},</Text>
          <Text style={styles.userNameText}>{user?.name || 'Staff'}</Text>
          <Text style={styles.companyText}>{company?.name || 'PayRoster'}</Text>
        </View>
        <TouchableOpacity
          style={styles.avatarBtn}
          onPress={() => navigation.navigate('StaffProfile')}
        >
          <Text style={styles.avatarText}>{initials(user?.name || 'ST')}</Text>
        </TouchableOpacity>
      </View>

      {/* Today's Punch Card */}
      <Card style={styles.punchCard} elevation="md">
        <View style={styles.punchCardHeader}>
          <View>
            <Text style={styles.punchCardTitle}>Today's Attendance</Text>
            <Text style={styles.punchCardDate}>{formatDate(new Date())}</Text>
          </View>
          <Badge label={status.label} variant={status.variant} />
        </View>

        <View style={styles.punchTimesRow}>
          <View style={styles.punchTimeBox}>
            <View style={[styles.punchIconCircle, { backgroundColor: colors.successBg }]}>
              <MaterialCommunityIcons name="login" size={20} color={colors.success} />
            </View>
            <View>
              <Text style={styles.punchTimeLabel}>Punch In</Text>
              <Text style={styles.punchTimeVal}>
                {todayAttendance?.punchIn?.time ? formatTime(todayAttendance.punchIn.time) : '--:--'}
              </Text>
            </View>
          </View>

          <View style={styles.punchDivider} />

          <View style={styles.punchTimeBox}>
            <View style={[styles.punchIconCircle, { backgroundColor: colors.dangerBg }]}>
              <MaterialCommunityIcons name="logout" size={20} color={colors.danger} />
            </View>
            <View>
              <Text style={styles.punchTimeLabel}>Punch Out</Text>
              <Text style={styles.punchTimeVal}>
                {todayAttendance?.punchOut?.time ? formatTime(todayAttendance.punchOut.time) : '--:--'}
              </Text>
            </View>
          </View>
        </View>

        <Button
          title={isPunchedIn && !isPunchedOut ? 'Punch Out Now' : 'Punch In Now'}
          onPress={() => navigation.navigate('StaffPunch')}
          icon="map-marker-radius"
          style={styles.punchActionBtn}
        />
      </Card>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsGrid}>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('StaffPunch')}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIconCircle, { backgroundColor: '#e0e7ff' }]}>
            <MaterialCommunityIcons name="map-marker-radius-outline" size={24} color={colors.primary} />
          </View>
          <Text style={styles.actionLabel}>Geofence Punch</Text>
          <Text style={styles.actionDesc}>Check in/out at office</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('StaffAttendance')}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIconCircle, { backgroundColor: '#fef3c7' }]}>
            <MaterialCommunityIcons name="clock-time-four-outline" size={24} color={colors.warning} />
          </View>
          <Text style={styles.actionLabel}>My Attendance</Text>
          <Text style={styles.actionDesc}>Monthly history</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('StaffLeaves')}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIconCircle, { backgroundColor: '#dcfce7' }]}>
            <MaterialCommunityIcons name="calendar-check-outline" size={24} color={colors.success} />
          </View>
          <Text style={styles.actionLabel}>Apply Leave</Text>
          <Text style={styles.actionDesc}>CL & EL requests</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('StaffSalary')}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIconCircle, { backgroundColor: '#ecfdf5' }]}>
            <MaterialCommunityIcons name="file-document-outline" size={24} color={colors.primary} />
          </View>
          <Text style={styles.actionLabel}>Salary Slips</Text>
          <Text style={styles.actionDesc}>Monthly payslips</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('StaffCorrections')}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIconCircle, { backgroundColor: '#fef3c7' }]}>
            <MaterialCommunityIcons name="timer-edit-outline" size={24} color={colors.warning} />
          </View>
          <Text style={styles.actionLabel}>Punch Fix</Text>
          <Text style={styles.actionDesc}>Request correction</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('StaffMeetings')}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIconCircle, { backgroundColor: '#e0f2fe' }]}>
            <MaterialCommunityIcons name="briefcase-clock-outline" size={24} color={colors.info} />
          </View>
          <Text style={styles.actionLabel}>Client Visits</Text>
          <Text style={styles.actionDesc}>Sales & field visits</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('StaffProfile')}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIconCircle, { backgroundColor: '#ede9fe' }]}>
            <MaterialCommunityIcons name="account-circle-outline" size={24} color={colors.chart1} />
          </View>
          <Text style={styles.actionLabel}>My Profile</Text>
          <Text style={styles.actionDesc}>Details & Settings</Text>
        </TouchableOpacity>
      </View>
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
  companyText: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  avatarBtn: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
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
  punchCard: {
    padding: 20,
    marginBottom: 24,
  },
  punchCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  punchCardTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  punchCardDate: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  punchTimesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: borderRadius.md,
    padding: 12,
    marginBottom: 16,
  },
  punchTimeBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  punchIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  punchTimeLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
  punchTimeVal: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginTop: 1,
  },
  punchDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
    marginHorizontal: 8,
  },
  punchActionBtn: {
    width: '100%',
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: 14,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    width: '48%',
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    ...shadows.sm,
  },
  actionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  actionLabel: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  actionDesc: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
