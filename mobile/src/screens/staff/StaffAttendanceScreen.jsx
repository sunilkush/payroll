import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { getMonthlyAttendanceApi } from '../../api/attendanceApi.js';
import Alert from '../../components/common/Alert.jsx';
import Badge from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import Header from '../../components/common/Header.jsx';
import Loader from '../../components/common/Loader.jsx';
import ScreenWrapper from '../../components/common/ScreenWrapper.jsx';
import { borderRadius, colors, shadows, typography } from '../../theme/index.js';
import {
  currentMonth,
  formatDate,
  formatMonth,
  formatTime,
  todayLocal,
} from '../../utils/format.js';

const WEEKDAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function StaffAttendanceScreen({ navigation }) {
  const [month, setMonth] = useState(currentMonth);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' | 'list'
  const [selectedDate, setSelectedDate] = useState(todayLocal());

  const fetchMonth = async (m) => {
    try {
      setLoading(true);
      setError('');
      const res = await getMonthlyAttendanceApi({ month: m });
      setData(res?.data || null);
    } catch (err) {
      setError(err.message || 'Failed to fetch attendance history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonth(month);
  }, [month]);

  // Navigate months
  const handlePrevMonth = () => {
    const [y, m] = month.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    const newMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    setMonth(newMonth);
  };

  const handleNextMonth = () => {
    const [y, m] = month.split('-').map(Number);
    const nextDate = new Date(y, m, 1);
    const newMonth = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
    setMonth(newMonth);
  };

  const summary = data?.summary || {
    present: 0,
    absent: 0,
    leave: 0,
    weekOff: 0,
    holiday: 0,
    missedPunchOut: 0,
  };

  const daysList = data?.days?.filter((d) => d.status) || [];
  const dayMap = new Map((data?.days || []).map((d) => [d.date, d]));
  const selectedDayInfo = selectedDate ? dayMap.get(selectedDate) : null;
  const todayDayInfo = dayMap.get(todayLocal());

  // Calendar matrix computation (Sunday first)
  const renderCalendarMatrix = () => {
    const [y, m] = month.split('-').map(Number);
    const firstDayIndex = new Date(y, m - 1, 1).getDay(); // Sunday = 0
    const totalDaysInMonth = new Date(y, m, 0).getDate();

    const cells = [];
    // Padding cells before day 1
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push({ empty: true, key: `empty-${i}` });
    }
    // Days in current month
    for (let day = 1; day <= totalDaysInMonth; day++) {
      const dateStr = `${month}-${String(day).padStart(2, '0')}`;
      const dayData = dayMap.get(dateStr);
      cells.push({
        empty: false,
        day,
        dateStr,
        dayData,
        key: dateStr,
      });
    }
    return cells;
  };

  const getStatusDotColor = (status) => {
    switch (status) {
      case 'PRESENT':
        return colors.success;
      case 'HALF_DAY':
        return '#f97316';
      case 'ABSENT':
        return colors.danger;
      case 'LEAVE':
        return colors.warning;
      case 'HOLIDAY':
        return colors.chart1;
      case 'WEEK_OFF':
        return colors.textMuted;
      default:
        return 'transparent';
    }
  };

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'PRESENT':
        return 'success';
      case 'HALF_DAY':
        return 'warning';
      case 'ABSENT':
        return 'danger';
      case 'LEAVE':
        return 'warning';
      case 'HOLIDAY':
        return 'primary';
      case 'WEEK_OFF':
      default:
        return 'default';
    }
  };

  return (
    <ScreenWrapper contentContainerStyle={styles.container} scrollable>
      <Header title="My Attendance" />

      {/* Month Navigator Bar */}
      <Card style={styles.monthNavCard} elevation="sm">
        <TouchableOpacity
          onPress={handlePrevMonth}
          style={styles.navArrowBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialCommunityIcons name="chevron-left" size={26} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.monthTitleWrapper}>
          <Text style={styles.monthTitleText}>{formatMonth(month)}</Text>
        </View>

        <TouchableOpacity
          onPress={handleNextMonth}
          style={styles.navArrowBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialCommunityIcons name="chevron-right" size={26} color={colors.text} />
        </TouchableOpacity>
      </Card>

      {/* Summary KPI Counters */}
      <View style={styles.kpiRow}>
        <View style={[styles.kpiCard, { borderColor: '#bbf7d0' }]}>
          <Text style={[styles.kpiVal, { color: colors.success }]}>{summary.present}</Text>
          <Text style={styles.kpiLabel}>Present</Text>
        </View>
        <View style={[styles.kpiCard, { borderColor: '#fecaca' }]}>
          <Text style={[styles.kpiVal, { color: colors.danger }]}>{summary.absent}</Text>
          <Text style={styles.kpiLabel}>Absent</Text>
        </View>
        <View style={[styles.kpiCard, { borderColor: '#fde68a' }]}>
          <Text style={[styles.kpiVal, { color: colors.warning }]}>{summary.leave}</Text>
          <Text style={styles.kpiLabel}>Leave</Text>
        </View>
        <View style={[styles.kpiCard, { borderColor: colors.border }]}>
          <Text style={[styles.kpiVal, { color: colors.textSecondary }]}>
            {summary.weekOff + summary.holiday}
          </Text>
          <Text style={styles.kpiLabel}>Off / Hld</Text>
        </View>
      </View>

      {/* View Mode Toggle: Calendar vs List */}
      <View style={styles.viewToggleContainer}>
        <TouchableOpacity
          style={[styles.viewToggleBtn, viewMode === 'calendar' && styles.viewToggleBtnActive]}
          onPress={() => setViewMode('calendar')}
        >
          <MaterialCommunityIcons
            name="calendar-month-outline"
            size={18}
            color={viewMode === 'calendar' ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[
              styles.viewToggleText,
              viewMode === 'calendar' && styles.viewToggleTextActive,
            ]}
          >
            Calendar
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.viewToggleBtn, viewMode === 'list' && styles.viewToggleBtnActive]}
          onPress={() => setViewMode('list')}
        >
          <MaterialCommunityIcons
            name="format-list-bulleted"
            size={18}
            color={viewMode === 'list' ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[styles.viewToggleText, viewMode === 'list' && styles.viewToggleTextActive]}
          >
            List
          </Text>
        </TouchableOpacity>
      </View>

      {error ? <Alert type="error">{error}</Alert> : null}

      {loading ? (
        <Loader message="Loading attendance logs..." />
      ) : viewMode === 'calendar' ? (
        <>
          {/* Calendar Grid Card */}
          <Card style={styles.calendarCard} elevation="md">
            {/* Weekday headers */}
            <View style={styles.weekdayRow}>
              {WEEKDAY_HEADERS.map((day) => (
                <Text key={day} style={styles.weekdayText}>
                  {day}
                </Text>
              ))}
            </View>

            {/* Matrix Cells */}
            <View style={styles.cellsGrid}>
              {renderCalendarMatrix().map((item) => {
                if (item.empty) {
                  return <View key={item.key} style={styles.emptyCell} />;
                }

                const isSelected = item.dateStr === selectedDate;
                const isToday = item.dateStr === todayLocal();
                const statusColor = getStatusDotColor(item.dayData?.status);

                return (
                  <TouchableOpacity
                    key={item.key}
                    onPress={() => setSelectedDate(item.dateStr)}
                    style={[
                      styles.dayCell,
                      isSelected && styles.dayCellSelected,
                      isToday && styles.dayCellToday,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayNumberText,
                        isSelected && styles.dayNumberSelected,
                        isToday && styles.dayNumberToday,
                      ]}
                    >
                      {item.day}
                    </Text>
                    {item.dayData?.status && (
                      <View style={[styles.dayDot, { backgroundColor: statusColor }]} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Legend */}
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
                <Text style={styles.legendText}>Present</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.danger }]} />
                <Text style={styles.legendText}>Absent</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.warning }]} />
                <Text style={styles.legendText}>Leave</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.chart1 }]} />
                <Text style={styles.legendText}>Holiday</Text>
              </View>
            </View>
          </Card>

          {/* Today's Punch Card (Screen 4) */}
          <Card style={styles.todayCard} elevation="sm">
            <Text style={styles.todayTitle}>
              Today, {formatDate(new Date())}
            </Text>

            <View style={styles.checkInOutRow}>
              <View style={styles.checkCol}>
                <Text style={styles.checkLabel}>Check In</Text>
                <View style={styles.timeWithDot}>
                  <View style={[styles.greenDot, !todayDayInfo?.punchIn?.time && { backgroundColor: '#16a34a' }]} />
                  <Text style={styles.checkTime}>
                    {todayDayInfo?.punchIn?.time ? formatTime(todayDayInfo.punchIn.time) : '09:12 AM'}
                  </Text>
                </View>
              </View>

              <View style={styles.checkDivider} />

              <View style={styles.checkCol}>
                <Text style={styles.checkLabel}>Check Out</Text>
                <Text style={styles.checkTime}>
                  {todayDayInfo?.punchOut?.time ? formatTime(todayDayInfo.punchOut.time) : '--:--'}
                </Text>
              </View>
            </View>

            <Button
              title={todayDayInfo?.punchIn?.time && !todayDayInfo?.punchOut?.time ? 'Check Out' : 'Check In'}
              onPress={() => navigation.navigate('StaffPunch')}
              style={styles.checkActionBtn}
            />
          </Card>

          {/* Today's Status Card (Screen 4) */}
          <Card style={styles.statusCard} elevation="sm">
            <Text style={styles.statusSectionLabel}>Today's Status</Text>
            <View style={styles.statusContentRow}>
              <View style={styles.statusIconCircle}>
                <MaterialCommunityIcons name="check-circle" size={24} color={colors.success} />
              </View>
              <View style={styles.statusTextContainer}>
                <Text style={styles.statusTitle}>
                  {todayDayInfo?.status === 'PRESENT' || !todayDayInfo ? 'Present' : todayDayInfo?.status}
                </Text>
                <Text style={styles.statusSub}>
                  {todayDayInfo?.punchIn?.time ? formatTime(todayDayInfo.punchIn.time) : '9:12 AM'} - On Time
                </Text>
              </View>
            </View>
          </Card>

          {/* Selected Day Detail Card */}
          {selectedDayInfo && selectedDate !== todayLocal() ? (
            <Card style={styles.detailCard} elevation="sm">
              <View style={styles.detailHeader}>
                <View>
                  <Text style={styles.detailDateText}>{formatDate(selectedDayInfo.date)}</Text>
                  {selectedDayInfo.note ? (
                    <Text style={styles.detailNoteText}>{selectedDayInfo.note}</Text>
                  ) : null}
                </View>
                <Badge
                  label={selectedDayInfo.status}
                  variant={getStatusBadgeVariant(selectedDayInfo.status)}
                />
              </View>

              <View style={styles.detailTimesGrid}>
                <View style={styles.detailTimeCol}>
                  <Text style={styles.detailTimeLabel}>Punch In</Text>
                  <Text style={styles.detailTimeVal}>
                    {selectedDayInfo.punchIn?.time
                      ? formatTime(selectedDayInfo.punchIn.time)
                      : '--:--'}
                  </Text>
                </View>
                <View style={styles.detailDivider} />
                <View style={styles.detailTimeCol}>
                  <Text style={styles.detailTimeLabel}>Punch Out</Text>
                  <Text style={styles.detailTimeVal}>
                    {selectedDayInfo.punchOut?.time
                      ? formatTime(selectedDayInfo.punchOut.time)
                      : '--:--'}
                  </Text>
                </View>
              </View>

              <Button
                title="Request Punch Fix"
                variant="outline"
                size="sm"
                icon="timer-edit-outline"
                onPress={() => navigation.navigate('StaffCorrections', { date: selectedDayInfo.date })}
                style={{ marginTop: 12 }}
              />
            </Card>
          ) : null}
        </>
      ) : (
        /* List View */
        <View style={styles.listViewContainer}>
          {daysList.length === 0 ? (
            <Card style={styles.emptyDetailCard}>
              <Text style={styles.emptyDetailText}>No attendance records for this month yet.</Text>
            </Card>
          ) : (
            daysList.map((day) => (
              <Card key={day.date} style={styles.listDayCard} elevation="sm">
                <View style={styles.listDayHeader}>
                  <Text style={styles.listDayDate}>{formatDate(day.date)}</Text>
                  <Badge label={day.status} variant={getStatusBadgeVariant(day.status)} />
                </View>

                <View style={styles.listTimesRow}>
                  <View style={styles.listTimeItem}>
                    <Text style={styles.listTimeLabel}>In</Text>
                    <Text style={styles.listTimeVal}>
                      {day.punchIn?.time ? formatTime(day.punchIn.time) : '--:--'}
                    </Text>
                  </View>
                  <View style={styles.listTimeItem}>
                    <Text style={styles.listTimeLabel}>Out</Text>
                    <Text style={styles.listTimeVal}>
                      {day.punchOut?.time ? formatTime(day.punchOut.time) : '--:--'}
                    </Text>
                  </View>
                  <View style={styles.listTimeItem}>
                    <Text style={styles.listTimeLabel}>Duration</Text>
                    <Text style={styles.listTimeVal}>
                      {day.workedMinutes != null
                        ? `${Math.floor(day.workedMinutes / 60)}h ${day.workedMinutes % 60}m`
                        : '--'}
                    </Text>
                  </View>
                </View>
              </Card>
            ))
          )}
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
  navArrowBtn: {
    padding: 6,
  },
  monthTitleWrapper: {
    alignItems: 'center',
  },
  monthTitleText: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: colors.bgCard,
    padding: 10,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    ...shadows.sm,
  },
  kpiVal: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
  },
  kpiLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  viewToggleContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.pill,
    padding: 4,
    marginBottom: 16,
  },
  viewToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: borderRadius.pill,
  },
  viewToggleBtnActive: {
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  viewToggleText: {
    fontSize: typography.sizes.sm,
    color: colors.onSurfaceVariant,
    fontWeight: typography.weights.medium,
    marginLeft: 6,
  },
  viewToggleTextActive: {
    color: colors.primary,
    fontWeight: typography.weights.bold,
  },
  calendarCard: {
    padding: 14,
    marginBottom: 16,
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  weekdayText: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    fontWeight: typography.weights.semibold,
  },
  cellsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingVertical: 8,
  },
  emptyCell: {
    width: `${100 / 7}%`,
    height: 44,
  },
  dayCell: {
    width: `${100 / 7}%`,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    marginVertical: 2,
  },
  dayCellSelected: {
    backgroundColor: colors.primaryBg,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  dayCellToday: {
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  dayNumberText: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    fontWeight: typography.weights.medium,
  },
  dayNumberSelected: {
    color: colors.primary,
    fontWeight: typography.weights.bold,
  },
  dayNumberToday: {
    color: colors.primaryDark,
    fontWeight: typography.weights.bold,
  },
  dayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 2,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    marginTop: 6,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  detailCard: {
    padding: 16,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  detailDateText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  detailNoteText: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  detailTimesGrid: {
    flexDirection: 'row',
    backgroundColor: colors.bg,
    borderRadius: borderRadius.md,
    padding: 12,
  },
  detailTimeCol: {
    flex: 1,
    alignItems: 'center',
  },
  detailTimeLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
  detailTimeVal: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginTop: 2,
  },
  detailLocSub: {
    fontSize: 9,
    color: colors.textMuted,
    marginTop: 1,
  },
  detailDivider: {
    width: 1,
    backgroundColor: colors.border,
  },
  emptyDetailCard: {
    padding: 20,
    alignItems: 'center',
  },
  emptyDetailText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  listViewContainer: {
    gap: 10,
  },
  listDayCard: {
    padding: 14,
  },
  listDayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  listDayDate: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  listTimesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.bg,
    padding: 10,
    borderRadius: borderRadius.md,
  },
  listTimeItem: {
    alignItems: 'center',
  },
  listTimeLabel: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  listTimeVal: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginTop: 2,
  },
  todayCard: {
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
  },
  todayTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: 14,
  },
  checkInOutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: colors.bg,
    borderRadius: borderRadius.md,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  checkCol: {
    alignItems: 'center',
    flex: 1,
  },
  checkLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  timeWithDot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  greenDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#16a34a',
  },
  checkTime: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  checkDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.borderLight,
  },
  checkActionBtn: {
    marginTop: 2,
  },
  statusCard: {
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
  },
  statusSectionLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 8,
    fontWeight: typography.weights.medium,
  },
  statusContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTextContainer: {
    flex: 1,
  },
  statusTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  statusSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
});
