import { useEffect, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { getAttendanceReportApi } from '../../api/attendanceApi.js';
import Alert from '../../components/common/Alert.jsx';
import Badge from '../../components/common/Badge.jsx';
import Card from '../../components/common/Card.jsx';
import Header from '../../components/common/Header.jsx';
import Loader from '../../components/common/Loader.jsx';
import ScreenWrapper from '../../components/common/ScreenWrapper.jsx';
import { borderRadius, colors, shadows, typography } from '../../theme/index.js';
import { currentMonth, formatMonth } from '../../utils/format.js';
import { initials } from '../../utils/roles.js';

export default function AdminAttendanceScreen({ navigation }) {
  const [month, setMonth] = useState(currentMonth);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchReport = async (m) => {
    try {
      setError('');
      const res = await getAttendanceReportApi(m);
      setRows(res?.data?.rows || []);
    } catch (err) {
      setError(err.message || 'Failed to load attendance report.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReport(month);
  }, [month]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchReport(month);
  };

  const handlePrevMonth = () => {
    const [y, m] = month.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    setMonth(`${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [y, m] = month.split('-').map(Number);
    const nextDate = new Date(y, m, 1);
    setMonth(`${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`);
  };

  // Aggregates for the whole company
  const totals = rows.reduce(
    (acc, r) => {
      acc.present += r.summary?.present || 0;
      acc.absent += r.summary?.absent || 0;
      acc.leave += r.summary?.leave || 0;
      acc.missed += r.summary?.missedPunchOut || 0;
      return acc;
    },
    { present: 0, absent: 0, leave: 0, missed: 0 }
  );

  return (
    <ScreenWrapper contentContainerStyle={styles.container} scrollable>
      <Header
        title="Company Attendance"
        onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
      />

      {/* Month Navigator */}
      <Card style={styles.monthNavCard} elevation="sm">
        <TouchableOpacity
          onPress={handlePrevMonth}
          style={styles.navBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialCommunityIcons name="chevron-left" size={26} color={colors.text} />
        </TouchableOpacity>

        <Text style={styles.monthText}>{formatMonth(month)}</Text>

        <TouchableOpacity
          onPress={handleNextMonth}
          style={styles.navBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialCommunityIcons name="chevron-right" size={26} color={colors.text} />
        </TouchableOpacity>
      </Card>

      {/* Aggregate KPI Badges */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { borderColor: '#bbf7d0' }]}>
          <Text style={[styles.summaryVal, { color: colors.success }]}>{totals.present}</Text>
          <Text style={styles.summaryLabel}>Total Present</Text>
        </View>
        <View style={[styles.summaryCard, { borderColor: '#fecaca' }]}>
          <Text style={[styles.summaryVal, { color: colors.danger }]}>{totals.absent}</Text>
          <Text style={styles.summaryLabel}>Total Absent</Text>
        </View>
        <View style={[styles.summaryCard, { borderColor: '#fde68a' }]}>
          <Text style={[styles.summaryVal, { color: colors.warning }]}>{totals.leave}</Text>
          <Text style={styles.summaryLabel}>On Leave</Text>
        </View>
        <View style={[styles.summaryCard, { borderColor: '#fed7aa' }]}>
          <Text style={[styles.summaryVal, { color: '#ea580c' }]}>{totals.missed}</Text>
          <Text style={styles.summaryLabel}>Missed Out</Text>
        </View>
      </View>

      {error ? <Alert type="error">{error}</Alert> : null}

      <Text style={styles.sectionTitle}>Employee Attendance Breakdown</Text>

      {loading ? (
        <Loader message="Compiling monthly attendance report..." />
      ) : rows.length === 0 ? (
        <Card style={styles.emptyCard}>
          <MaterialCommunityIcons name="calendar-clock" size={44} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No attendance data</Text>
          <Text style={styles.emptySub}>No staff attendance logged for {formatMonth(month)}.</Text>
        </Card>
      ) : (
        <View style={styles.rowsList}>
          {rows.map(({ staff, summary }) => (
            <Card key={staff._id} style={styles.staffAttendanceCard} elevation="sm">
              <View style={styles.staffHeader}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials(staff.name)}</Text>
                </View>
                <View style={styles.staffInfo}>
                  <Text style={styles.staffName}>{staff.name}</Text>
                  <Text style={styles.staffCode}>
                    {staff.employeeCode ? `ID: ${staff.employeeCode}` : staff.email}
                  </Text>
                </View>
                {!staff.isActive && (
                  <Badge label="Inactive" variant="danger" size="sm" />
                )}
              </View>

              {/* Counts Grid */}
              <View style={styles.countsGrid}>
                <View style={styles.countCol}>
                  <Text style={[styles.countNum, { color: colors.success }]}>
                    {summary.present}
                  </Text>
                  <Text style={styles.countText}>Present</Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.countCol}>
                  <Text style={[styles.countNum, { color: colors.danger }]}>
                    {summary.absent}
                  </Text>
                  <Text style={styles.countText}>Absent</Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.countCol}>
                  <Text style={[styles.countNum, { color: colors.warning }]}>
                    {summary.leave}
                  </Text>
                  <Text style={styles.countText}>Leave</Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.countCol}>
                  <Text style={styles.countNum}>
                    {summary.weekOff + summary.holiday}
                  </Text>
                  <Text style={styles.countText}>Off/Hld</Text>
                </View>

                {summary.missedPunchOut > 0 ? (
                  <>
                    <View style={styles.divider} />
                    <View style={styles.countCol}>
                      <Text style={[styles.countNum, { color: '#ea580c' }]}>
                        {summary.missedPunchOut}
                      </Text>
                      <Text style={styles.countText}>Missed</Text>
                    </View>
                  </>
                ) : null}
              </View>
            </Card>
          ))}
        </View>
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 32,
  },
  monthNavCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  navBtn: {
    padding: 6,
  },
  monthText: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.bgCard,
    padding: 10,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    ...shadows.sm,
  },
  summaryVal: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
  },
  summaryLabel: {
    fontSize: 9,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: 12,
  },
  rowsList: {
    gap: 12,
  },
  staffAttendanceCard: {
    padding: 14,
  },
  staffHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  staffInfo: {
    flex: 1,
  },
  staffName: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  staffCode: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1,
  },
  countsGrid: {
    flexDirection: 'row',
    backgroundColor: colors.bg,
    borderRadius: borderRadius.md,
    padding: 10,
  },
  countCol: {
    flex: 1,
    alignItems: 'center',
  },
  countNum: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  countText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    width: 1,
    backgroundColor: colors.border,
  },
  emptyCard: {
    padding: 32,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginTop: 12,
  },
  emptySub: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
});
