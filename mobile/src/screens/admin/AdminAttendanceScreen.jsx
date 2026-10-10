import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert as NativeAlert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import {
  getAttendanceReportApi,
  getMonthlyAttendanceApi,
  getTodaySummaryApi,
} from '../../api/attendanceApi.js';
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
  WEEKDAYS,
} from '../../utils/format.js';
import { initials } from '../../utils/roles.js';

const CALENDAR_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function AdminAttendanceScreen({ navigation }) {
  const [viewTab, setViewTab] = useState('TODAY'); // 'TODAY' | 'MONTHLY'
  const [month, setMonth] = useState(currentMonth());

  // Today Summary State
  const [todaySummary, setTodaySummary] = useState(null);
  const [todayLoading, setTodayLoading] = useState(true);

  // Monthly Report State
  const [rows, setRows] = useState([]);
  const [monthlyLoading, setMonthlyLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL'); // 'ALL' | 'ABSENT' | 'LEAVE' | 'MISSED'

  // Staff Monthly Attendance Inspector Modal State
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [staffMonthlyData, setStaffMonthlyData] = useState(null);
  const [loadingStaffDetail, setLoadingStaffDetail] = useState(false);
  const [selectedDate, setSelectedDate] = useState(todayLocal());

  // Fetch Today's Live Attendance Pulse
  const fetchToday = useCallback(async () => {
    try {
      setTodayLoading(true);
      const res = await getTodaySummaryApi();
      setTodaySummary(res?.data || null);
    } catch (err) {
      console.warn('Failed to load today summary:', err.message);
    } finally {
      setTodayLoading(false);
    }
  }, []);

  // Fetch Monthly Attendance Report
  const fetchReport = useCallback(async (m) => {
    try {
      setMonthlyLoading(true);
      setError('');
      const res = await getAttendanceReportApi(m);
      setRows(res?.data?.rows || []);
    } catch (err) {
      setError(err.message || 'Failed to load attendance report.');
    } finally {
      setMonthlyLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchToday();
  }, [fetchToday]);

  useEffect(() => {
    fetchReport(month);
  }, [fetchReport, month]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchToday(), fetchReport(month)]);
    setRefreshing(false);
  };

  const handlePrevMonth = () => {
    const [y, m] = month.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    setMonth(`${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [y, m] = month.split('-').map(Number);
    const nextDate = new Date(y, m, 1);
    const nextMonthStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
    if (nextMonthStr <= currentMonth()) {
      setMonth(nextMonthStr);
    }
  };

  const canGoNext = month < currentMonth();

  // Company Monthly Aggregates
  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        acc.present += r.summary?.present || 0;
        acc.absent += r.summary?.absent || 0;
        acc.leave += r.summary?.leave || 0;
        acc.missed += r.summary?.missedPunchOut || 0;
        acc.weekOff += r.summary?.weekOff || 0;
        acc.holiday += r.summary?.holiday || 0;
        return acc;
      },
      { present: 0, absent: 0, leave: 0, missed: 0, weekOff: 0, holiday: 0 }
    );
  }, [rows]);

  // Filtered Rows for Monthly Tab
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      const staff = r.staff;
      if (!staff) return false;
      const q = searchQuery.trim().toLowerCase();
      const matchSearch =
        !q ||
        staff.name?.toLowerCase().includes(q) ||
        staff.employeeCode?.toLowerCase().includes(q);

      const summary = r.summary || {};
      let matchFilter = true;
      if (filterType === 'ABSENT') {
        matchFilter = (summary.absent || 0) >= 2;
      } else if (filterType === 'LEAVE') {
        matchFilter = (summary.leave || 0) > 0;
      } else if (filterType === 'MISSED') {
        matchFilter = (summary.missedPunchOut || 0) > 0;
      }

      return matchSearch && matchFilter;
    });
  }, [rows, searchQuery, filterType]);

  // Open Staff Calendar Inspector
  const openStaffInspector = async (staff) => {
    setSelectedStaff(staff);
    setLoadingStaffDetail(true);
    setStaffMonthlyData(null);
    setSelectedDate(todayLocal());
    try {
      const res = await getMonthlyAttendanceApi({ userId: staff._id, month });
      setStaffMonthlyData(res?.data || null);
    } catch (err) {
      NativeAlert.alert('Load Error', err.message || 'Could not fetch monthly attendance details.');
    } finally {
      setLoadingStaffDetail(false);
    }
  };

  // Calendar matrix for Staff Inspector
  const renderCalendarMatrix = () => {
    const [y, m] = month.split('-').map(Number);
    const firstDayIndex = new Date(y, m - 1, 1).getDay(); // Sunday = 0
    const totalDaysInMonth = new Date(y, m, 0).getDate();

    const dayMap = new Map((staffMonthlyData?.days || []).map((d) => [d.date, d]));
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'PRESENT':
        return '#16A34A';
      case 'HALF_DAY':
        return '#EA580C';
      case 'ABSENT':
        return '#DC2626';
      case 'LEAVE':
        return '#D97706';
      case 'HOLIDAY':
        return '#7C3AED';
      case 'WEEK_OFF':
        return '#64748B';
      default:
        return '#94A3B8';
    }
  };

  const selectedDayInfo = useMemo(() => {
    if (!staffMonthlyData?.days || !selectedDate) return null;
    return staffMonthlyData.days.find((d) => d.date === selectedDate);
  }, [staffMonthlyData, selectedDate]);

  // Today turnout progress percentage
  const turnoutPercent = useMemo(() => {
    if (!todaySummary || !todaySummary.totalStaff) return 0;
    return Math.round((todaySummary.present / todaySummary.totalStaff) * 100);
  }, [todaySummary]);

  return (
    <ScreenWrapper
      contentContainerStyle={styles.container}
      scrollable
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
    >
      <Header
        title="Company Attendance"
        onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
        rightIcon="refresh"
        onRightPress={onRefresh}
      />

      {error ? <Alert type="error" style={styles.topAlert}>{error}</Alert> : null}

      {/* ── 1. Top Segmented View Switcher ── */}
      <View style={styles.viewTabsBar}>
        <TouchableOpacity
          style={[styles.viewTabBtn, viewTab === 'TODAY' && styles.viewTabBtnActive]}
          onPress={() => setViewTab('TODAY')}
          activeOpacity={0.8}
        >
          <View style={styles.viewTabInner}>
            <View style={styles.pulseLiveDot} />
            <Text style={[styles.viewTabText, viewTab === 'TODAY' && styles.viewTabTextActive]}>
              Today Live ({todaySummary?.present || 0}/{todaySummary?.totalStaff || 0})
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.viewTabBtn, viewTab === 'MONTHLY' && styles.viewTabBtnActive]}
          onPress={() => setViewTab('MONTHLY')}
          activeOpacity={0.8}
        >
          <View style={styles.viewTabInner}>
            <MaterialCommunityIcons
              name="calendar-month-outline"
              size={15}
              color={viewTab === 'MONTHLY' ? colors.primary : colors.textSecondary}
            />
            <Text style={[styles.viewTabText, viewTab === 'MONTHLY' && styles.viewTabTextActive]}>
              Monthly Report ({formatMonth(month)})
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* ══════════════════════════════════════════════════
          MODE A: TODAY LIVE PULSE
         ══════════════════════════════════════════════════ */}
      {viewTab === 'TODAY' && (
        <View style={styles.tabContent}>
          {todayLoading ? (
            <Loader message="Loading today's live turnout..." />
          ) : todaySummary ? (
            <>
              {/* Today Executive Pulse Hero Card */}
              <Card style={styles.todayHeroCard} elevation="sm">
                <View style={styles.todayHeroHeader}>
                  <View>
                    <Text style={styles.todayDateText}>
                      {new Date().toLocaleDateString('en-IN', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </Text>
                    <Text style={styles.todaySubText}>Live Staff Attendance Monitoring</Text>
                  </View>
                  <View
                    style={[
                      styles.dayTypeBadge,
                      todaySummary.dayType === 'WORKING'
                        ? styles.dayTypeWorking
                        : styles.dayTypeOff,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayTypeText,
                        todaySummary.dayType === 'WORKING'
                          ? styles.dayTypeTextWorking
                          : styles.dayTypeTextOff,
                      ]}
                    >
                      {todaySummary.dayType === 'WORKING'
                        ? 'WORKING DAY'
                        : todaySummary.dayType === 'WEEK_OFF'
                        ? 'WEEK OFF'
                        : 'HOLIDAY'}
                    </Text>
                  </View>
                </View>

                {/* Turnout Progress Bar */}
                <View style={styles.turnoutBarWrap}>
                  <View style={styles.turnoutInfoRow}>
                    <Text style={styles.turnoutLabel}>Office Turnout Rate</Text>
                    <Text style={styles.turnoutPercentText}>{turnoutPercent}%</Text>
                  </View>
                  <View style={styles.progressBarTrack}>
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${Math.min(100, turnoutPercent)}%` },
                      ]}
                    />
                  </View>
                </View>

                {/* 4 Pulse KPI Tiles */}
                <View style={styles.pulseKpiGrid}>
                  <View style={[styles.pulseKpiCard, { borderColor: '#BBF7D0', backgroundColor: '#F0FDF4' }]}>
                    <View style={styles.pulseKpiIconCircle}>
                      <MaterialCommunityIcons name="account-check" size={20} color="#16A34A" />
                    </View>
                    <Text style={[styles.pulseKpiNum, { color: '#16A34A' }]}>{todaySummary.present}</Text>
                    <Text style={styles.pulseKpiLabel}>Present in Office</Text>
                  </View>

                  <View style={[styles.pulseKpiCard, { borderColor: '#BFDBFE', backgroundColor: '#EFF6FF' }]}>
                    <View style={styles.pulseKpiIconCircle}>
                      <MaterialCommunityIcons name="logout-variant" size={20} color={colors.primary} />
                    </View>
                    <Text style={[styles.pulseKpiNum, { color: colors.primary }]}>{todaySummary.punchedOut}</Text>
                    <Text style={styles.pulseKpiLabel}>Punched Out</Text>
                  </View>

                  <View style={[styles.pulseKpiCard, { borderColor: '#FDE68A', backgroundColor: '#FEFCE8' }]}>
                    <View style={styles.pulseKpiIconCircle}>
                      <MaterialCommunityIcons name="beach" size={20} color="#D97706" />
                    </View>
                    <Text style={[styles.pulseKpiNum, { color: '#D97706' }]}>{todaySummary.onLeave}</Text>
                    <Text style={styles.pulseKpiLabel}>On Approved Leave</Text>
                  </View>

                  <View style={[styles.pulseKpiCard, { borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' }]}>
                    <View style={styles.pulseKpiIconCircle}>
                      <MaterialCommunityIcons name="clock-alert-outline" size={20} color={colors.textSecondary} />
                    </View>
                    <Text style={[styles.pulseKpiNum, { color: colors.textSecondary }]}>{todaySummary.notMarked}</Text>
                    <Text style={styles.pulseKpiLabel}>Pending Check-In</Text>
                  </View>
                </View>

                {/* Geofence Locations Status */}
                <View style={styles.geofenceStatusRow}>
                  <MaterialCommunityIcons
                    name={todaySummary.locationsCount > 0 ? 'shield-check' : 'alert-circle'}
                    size={16}
                    color={todaySummary.locationsCount > 0 ? '#16A34A' : colors.warning}
                  />
                  <Text style={styles.geofenceStatusText}>
                    {todaySummary.locationsCount > 0
                      ? `${todaySummary.locationsCount} Office Geofence Branches Active`
                      : 'No office geofence added. Staff cannot punch attendance until a branch is saved in Company Settings.'}
                  </Text>
                </View>
              </Card>

              {/* Today Live Roster Feed */}
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Employee Attendance Overview</Text>
                <TouchableOpacity
                  onPress={() => setViewTab('MONTHLY')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.seeMonthReportText}>Monthly Breakdown →</Text>
                </TouchableOpacity>
              </View>

              {rows.length === 0 ? (
                <Card style={styles.emptyCard} elevation="xs">
                  <MaterialCommunityIcons name="account-group-outline" size={40} color={colors.textSecondary} />
                  <Text style={styles.emptyTitle}>No staff members found</Text>
                  <Text style={styles.emptySub}>Add employees in the Staff section to monitor live attendance.</Text>
                </Card>
              ) : (
                <View style={styles.staffList}>
                  {rows.map((r, idx) => {
                    const staff = r.staff;
                    const summary = r.summary || {};
                    if (!staff) return null;
                    return (
                      <Card key={staff._id || idx} style={styles.staffSummaryCard} elevation="xs">
                        <TouchableOpacity
                          onPress={() => openStaffInspector(staff)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.staffCardHeader}>
                            <View style={styles.avatar}>
                              <Text style={styles.avatarText}>{initials(staff.name || 'EM')}</Text>
                            </View>
                            <View style={styles.staffInfo}>
                              <Text style={styles.staffName}>{staff.name || 'Employee'}</Text>
                              <Text style={styles.staffCode}>
                                {staff.employeeCode ? `ID: ${staff.employeeCode}` : staff.email || '—'}
                              </Text>
                            </View>
                            <View style={styles.statusChip}>
                              <Text style={styles.statusChipText}>View Calendar</Text>
                              <MaterialCommunityIcons name="chevron-right" size={16} color={colors.primary} />
                            </View>
                          </View>

                          <View style={styles.staffCountsStrip}>
                            <View style={styles.stripItem}>
                              <Text style={[styles.stripNum, { color: colors.success }]}>
                                {summary.present || 0}
                              </Text>
                              <Text style={styles.stripLabel}>Present</Text>
                            </View>
                            <View style={styles.stripDivider} />
                            <View style={styles.stripItem}>
                              <Text style={[styles.stripNum, { color: colors.danger }]}>
                                {summary.absent || 0}
                              </Text>
                              <Text style={styles.stripLabel}>Absent</Text>
                            </View>
                            <View style={styles.stripDivider} />
                            <View style={styles.stripItem}>
                              <Text style={[styles.stripNum, { color: colors.warning }]}>
                                {summary.leave || 0}
                              </Text>
                              <Text style={styles.stripLabel}>Leave</Text>
                            </View>
                            <View style={styles.stripDivider} />
                            <View style={styles.stripItem}>
                              <Text style={styles.stripNum}>
                                {(summary.weekOff || 0) + (summary.holiday || 0)}
                              </Text>
                              <Text style={styles.stripLabel}>Off/Hld</Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                      </Card>
                    );
                  })}
                </View>
              )}
            </>
          ) : null}
        </View>
      )}

      {/* ══════════════════════════════════════════════════
          MODE B: MONTHLY REPORT BREAKDOWN
         ══════════════════════════════════════════════════ */}
      {viewTab === 'MONTHLY' && (
        <View style={styles.tabContent}>
          {/* Month Navigator */}
          <Card style={styles.monthNavCard} elevation="xs">
            <TouchableOpacity
              onPress={handlePrevMonth}
              style={styles.navBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialCommunityIcons name="chevron-left" size={24} color={colors.text} />
            </TouchableOpacity>

            <View style={styles.monthCenter}>
              <Text style={styles.monthText}>{formatMonth(month)}</Text>
              <Text style={styles.monthSub}>
                {rows.length} Staff Attendance Roster
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleNextMonth}
              style={[styles.navBtn, !canGoNext && styles.navBtnDisabled]}
              disabled={!canGoNext}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialCommunityIcons
                name="chevron-right"
                size={24}
                color={canGoNext ? colors.text : colors.textMuted}
              />
            </TouchableOpacity>
          </Card>

          {/* Aggregate KPI Strip */}
          <View style={styles.summaryRow}>
            <View style={[styles.summaryCard, { borderColor: '#BBF7D0', backgroundColor: '#F0FDF4' }]}>
              <Text style={[styles.summaryVal, { color: colors.success }]}>{totals.present}</Text>
              <Text style={styles.summaryLabel}>Total Present</Text>
            </View>
            <View style={[styles.summaryCard, { borderColor: '#FECACA', backgroundColor: '#FEF2F2' }]}>
              <Text style={[styles.summaryVal, { color: colors.danger }]}>{totals.absent}</Text>
              <Text style={styles.summaryLabel}>Total Absent</Text>
            </View>
            <View style={[styles.summaryCard, { borderColor: '#FDE68A', backgroundColor: '#FEFCE8' }]}>
              <Text style={[styles.summaryVal, { color: colors.warning }]}>{totals.leave}</Text>
              <Text style={styles.summaryLabel}>On Leave</Text>
            </View>
            <View style={[styles.summaryCard, { borderColor: '#FED7AA', backgroundColor: '#FFF7ED' }]}>
              <Text style={[styles.summaryVal, { color: '#EA580C' }]}>{totals.missed}</Text>
              <Text style={styles.summaryLabel}>Missed Out</Text>
            </View>
          </View>

          {/* Search & Filter Bar */}
          <View style={styles.searchAndFilters}>
            <View style={styles.searchWrap}>
              <MaterialCommunityIcons name="magnify" size={18} color={colors.textSecondary} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search staff by name or code..."
                placeholderTextColor={colors.textMuted}
                style={styles.searchInput}
                clearButtonMode="while-editing"
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <MaterialCommunityIcons name="close-circle" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={styles.filterChipsRow}>
              {[
                { id: 'ALL', label: `All (${rows.length})` },
                { id: 'ABSENT', label: 'High Absent (>2)' },
                { id: 'LEAVE', label: 'On Leave' },
                { id: 'MISSED', label: 'Missed Out' },
              ].map((chip) => {
                const isSel = filterType === chip.id;
                return (
                  <TouchableOpacity
                    key={chip.id}
                    style={[styles.filterChip, isSel && styles.filterChipActive]}
                    onPress={() => setFilterType(chip.id)}
                  >
                    <Text style={[styles.filterChipText, isSel && styles.filterChipTextActive]}>
                      {chip.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {monthlyLoading ? (
            <Loader message="Compiling monthly attendance report..." />
          ) : filteredRows.length === 0 ? (
            <Card style={styles.emptyCard} elevation="xs">
              <MaterialCommunityIcons name="calendar-clock" size={40} color={colors.textSecondary} />
              <Text style={styles.emptyTitle}>No matching records found</Text>
              <Text style={styles.emptySub}>
                {searchQuery || filterType !== 'ALL'
                  ? 'Try clearing the search or filter options.'
                  : `No attendance recorded for ${formatMonth(month)}.`}
              </Text>
            </Card>
          ) : (
            <View style={styles.rowsList}>
              {filteredRows.map((row, idx) => {
                const staff = row?.staff;
                const summary = row?.summary || {};
                if (!staff) return null;

                const totalTracked = (summary.present || 0) + (summary.absent || 0) + (summary.leave || 0);
                const attendanceRate =
                  totalTracked > 0 ? Math.round(((summary.present || 0) / totalTracked) * 100) : 100;

                return (
                  <Card key={staff._id || idx} style={styles.staffAttendanceCard} elevation="xs">
                    <TouchableOpacity
                      onPress={() => openStaffInspector(staff)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.staffHeader}>
                        <View style={styles.avatar}>
                          <Text style={styles.avatarText}>{initials(staff.name || 'EM')}</Text>
                        </View>
                        <View style={styles.staffInfo}>
                          <View style={styles.staffNameRow}>
                            <Text style={styles.staffName}>{staff.name || 'Employee'}</Text>
                            {!staff.isActive && (
                              <Badge label="Inactive" variant="danger" size="sm" />
                            )}
                          </View>
                          <Text style={styles.staffCode}>
                            {staff.employeeCode ? `ID: ${staff.employeeCode}` : staff.email || '—'}
                          </Text>
                        </View>

                        <View style={styles.rateBadge}>
                          <Text style={styles.rateBadgeText}>{attendanceRate}% Rate</Text>
                        </View>
                      </View>

                      {/* Counts Grid */}
                      <View style={styles.countsGrid}>
                        <View style={styles.countCol}>
                          <Text style={[styles.countNum, { color: colors.success }]}>
                            {summary.present || 0}
                          </Text>
                          <Text style={styles.countText}>Present</Text>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.countCol}>
                          <Text style={[styles.countNum, { color: colors.danger }]}>
                            {summary.absent || 0}
                          </Text>
                          <Text style={styles.countText}>Absent</Text>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.countCol}>
                          <Text style={[styles.countNum, { color: colors.warning }]}>
                            {summary.leave || 0}
                          </Text>
                          <Text style={styles.countText}>Leave</Text>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.countCol}>
                          <Text style={styles.countNum}>
                            {(summary.weekOff || 0) + (summary.holiday || 0)}
                          </Text>
                          <Text style={styles.countText}>Off/Hld</Text>
                        </View>

                        {(summary.missedPunchOut || 0) > 0 ? (
                          <>
                            <View style={styles.divider} />
                            <View style={styles.countCol}>
                              <Text style={[styles.countNum, { color: '#EA580C' }]}>
                                {summary.missedPunchOut}
                              </Text>
                              <Text style={styles.countText}>Missed</Text>
                            </View>
                          </>
                        ) : null}
                      </View>

                      <View style={styles.cardFooterHint}>
                        <Text style={styles.inspectHintText}>Tap to view monthly calendar & punches</Text>
                        <MaterialCommunityIcons name="calendar-search" size={15} color={colors.primary} />
                      </View>
                    </TouchableOpacity>
                  </Card>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* ══════════════════════════════════════════════════
          STAFF MONTHLY CALENDAR INSPECTOR MODAL
         ══════════════════════════════════════════════════ */}
      <Modal
        visible={Boolean(selectedStaff)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedStaff(null)}
      >
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCardLarge} elevation="lg">
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>{selectedStaff?.name || 'Staff Attendance'}</Text>
                <Text style={styles.modalSub}>
                  {selectedStaff?.employeeCode ? `ID: ${selectedStaff.employeeCode}` : 'Employee'} •{' '}
                  {formatMonth(month)}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedStaff(null)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialCommunityIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {loadingStaffDetail ? (
              <View style={{ paddingVertical: 40 }}>
                <Loader message="Loading employee attendance history..." />
              </View>
            ) : staffMonthlyData ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Staff Summary Quick Pills */}
                <View style={styles.modalSummaryStrip}>
                  <View style={[styles.modalPill, { backgroundColor: '#DCFCE7' }]}>
                    <Text style={[styles.modalPillNum, { color: '#16A34A' }]}>
                      {staffMonthlyData.summary?.present || 0}
                    </Text>
                    <Text style={styles.modalPillText}>Present</Text>
                  </View>
                  <View style={[styles.modalPill, { backgroundColor: '#FEE2E2' }]}>
                    <Text style={[styles.modalPillNum, { color: '#DC2626' }]}>
                      {staffMonthlyData.summary?.absent || 0}
                    </Text>
                    <Text style={styles.modalPillText}>Absent</Text>
                  </View>
                  <View style={[styles.modalPill, { backgroundColor: '#FEF3C7' }]}>
                    <Text style={[styles.modalPillNum, { color: '#D97706' }]}>
                      {staffMonthlyData.summary?.leave || 0}
                    </Text>
                    <Text style={styles.modalPillText}>Leave</Text>
                  </View>
                  <View style={[styles.modalPill, { backgroundColor: '#F1F5F9' }]}>
                    <Text style={[styles.modalPillNum, { color: '#475569' }]}>
                      {(staffMonthlyData.summary?.weekOff || 0) + (staffMonthlyData.summary?.holiday || 0)}
                    </Text>
                    <Text style={styles.modalPillText}>Off/Hld</Text>
                  </View>
                </View>

                {/* Calendar Grid Matrix */}
                <Text style={styles.calendarSectionTitle}>Monthly Attendance Calendar</Text>
                <Card style={styles.calendarCard} elevation="xs">
                  {/* Weekday Headers */}
                  <View style={styles.calendarHeaderRow}>
                    {CALENDAR_HEADERS.map((h) => (
                      <Text key={h} style={styles.calendarHeaderText}>
                        {h}
                      </Text>
                    ))}
                  </View>

                  {/* Day Cells Grid */}
                  <View style={styles.calendarGrid}>
                    {renderCalendarMatrix().map((item) => {
                      if (item.empty) {
                        return <View key={item.key} style={styles.calendarCellEmpty} />;
                      }
                      const status = item.dayData?.status;
                      const isSelected = selectedDate === item.dateStr;
                      const statusColor = getStatusColor(status);

                      return (
                        <TouchableOpacity
                          key={item.key}
                          style={[
                            styles.calendarCell,
                            isSelected && styles.calendarCellSelected,
                          ]}
                          onPress={() => setSelectedDate(item.dateStr)}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.calendarCellNum,
                              isSelected && styles.calendarCellNumSelected,
                            ]}
                          >
                            {item.day}
                          </Text>
                          {status && (
                            <View
                              style={[
                                styles.calendarStatusDot,
                                { backgroundColor: statusColor },
                              ]}
                            />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Color Legend */}
                  <View style={styles.legendRow}>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: '#16A34A' }]} />
                      <Text style={styles.legendText}>Present</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: '#DC2626' }]} />
                      <Text style={styles.legendText}>Absent</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: '#D97706' }]} />
                      <Text style={styles.legendText}>Leave</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: '#64748B' }]} />
                      <Text style={styles.legendText}>Off/Hld</Text>
                    </View>
                  </View>
                </Card>

                {/* Selected Day Punch Breakdown Box */}
                {selectedDate && (
                  <View style={styles.dayInspectorBox}>
                    <View style={styles.dayInspectorHeader}>
                      <View>
                        <Text style={styles.dayInspectorDate}>{formatDate(selectedDate)}</Text>
                        <Text style={styles.dayInspectorWeekday}>
                          {WEEKDAYS[new Date(selectedDate).getDay()]}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.dayStatusBadge,
                          {
                            backgroundColor: selectedDayInfo?.status
                              ? `${getStatusColor(selectedDayInfo.status)}18`
                              : '#F1F5F9',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.dayStatusBadgeText,
                            {
                              color: selectedDayInfo?.status
                                ? getStatusColor(selectedDayInfo.status)
                                : colors.textSecondary,
                            },
                          ]}
                        >
                          {selectedDayInfo?.status || 'NOT MARKED'}
                        </Text>
                      </View>
                    </View>

                    {selectedDayInfo?.status === 'PRESENT' ? (
                      <View style={styles.punchTimesBox}>
                        <View style={styles.punchCol}>
                          <View style={styles.punchLabelRow}>
                            <MaterialCommunityIcons name="login" size={14} color="#16A34A" />
                            <Text style={styles.punchLabel}>Punch In</Text>
                          </View>
                          <Text style={styles.punchTimeVal}>
                            {selectedDayInfo.punchIn?.time
                              ? formatTime(selectedDayInfo.punchIn.time)
                              : '—'}
                          </Text>
                          <Text style={styles.punchLocVal} numberOfLines={1}>
                            {selectedDayInfo.punchIn?.locationName || 'Office'}
                          </Text>
                        </View>

                        <View style={styles.punchDivider} />

                        <View style={styles.punchCol}>
                          <View style={styles.punchLabelRow}>
                            <MaterialCommunityIcons name="logout" size={14} color={colors.primary} />
                            <Text style={styles.punchLabel}>Punch Out</Text>
                          </View>
                          <Text style={styles.punchTimeVal}>
                            {selectedDayInfo.punchOut?.time
                              ? formatTime(selectedDayInfo.punchOut.time)
                              : 'Missed Out'}
                          </Text>
                          <Text style={styles.punchLocVal} numberOfLines={1}>
                            {selectedDayInfo.punchOut?.locationName || 'Office'}
                          </Text>
                        </View>
                      </View>
                    ) : selectedDayInfo?.note ? (
                      <View style={styles.noteBox}>
                        <MaterialCommunityIcons name="information-outline" size={16} color={colors.primary} />
                        <Text style={styles.noteBoxText}>{selectedDayInfo.note}</Text>
                      </View>
                    ) : (
                      <Text style={styles.noPunchText}>
                        No punch-in recorded on this date. Marked as {selectedDayInfo?.status || 'Not Marked'}.
                      </Text>
                    )}
                  </View>
                )}

                <Button
                  title="Close Inspector"
                  variant="outline"
                  onPress={() => setSelectedStaff(null)}
                  style={{ marginTop: 14, marginBottom: 12 }}
                />
              </ScrollView>
            ) : null}
          </Card>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 40,
  },
  topAlert: {
    marginBottom: 12,
  },

  /* ── 1. Top View Switcher ── */
  viewTabsBar: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: borderRadius.pill,
    padding: 3,
    marginBottom: 14,
  },
  viewTabBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: borderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewTabBtnActive: {
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  viewTabInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pulseLiveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#16A34A',
  },
  viewTabText: {
    fontSize: 12,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
  },
  viewTabTextActive: {
    color: colors.primary,
    fontWeight: typography.weights.bold,
  },

  tabContent: {
    gap: 12,
  },

  /* ── Mode A: Today Pulse Card ── */
  todayHeroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  todayHeroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  todayDateText: {
    fontSize: 15,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
  },
  todaySubText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  dayTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  dayTypeWorking: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  dayTypeOff: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  dayTypeText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
  dayTypeTextWorking: {
    color: colors.primary,
  },
  dayTypeTextOff: {
    color: '#D97706',
  },
  turnoutBarWrap: {
    marginTop: 14,
    marginBottom: 14,
  },
  turnoutInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  turnoutLabel: {
    fontSize: 12,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
  },
  turnoutPercentText: {
    fontSize: 13,
    fontWeight: typography.weights.bold,
    color: '#16A34A',
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#16A34A',
    borderRadius: 4,
  },
  pulseKpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pulseKpiCard: {
    flex: 1,
    minWidth: '46%',
    borderRadius: borderRadius.md,
    padding: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  pulseKpiIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  pulseKpiNum: {
    fontSize: 20,
    fontWeight: typography.weights.bold,
  },
  pulseKpiLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: typography.weights.medium,
  },
  geofenceStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  geofenceStatusText: {
    fontSize: 11,
    color: colors.textSecondary,
    flex: 1,
  },

  /* ── Section Headers ── */
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
  },
  seeMonthReportText: {
    fontSize: 12,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
  },

  /* ── Staff Cards in Today View ── */
  staffList: {
    gap: 10,
  },
  staffSummaryCard: {
    padding: 14,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  staffCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  statusChipText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: typography.weights.semibold,
  },
  staffCountsStrip: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: borderRadius.md,
    paddingVertical: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  stripItem: {
    flex: 1,
    alignItems: 'center',
  },
  stripDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
  },
  stripNum: {
    fontSize: 14,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
  },
  stripLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },

  /* ── Mode B: Monthly Report ── */
  monthNavCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  monthCenter: {
    alignItems: 'center',
  },
  monthText: {
    fontSize: 16,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
  },
  monthSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  navBtn: {
    padding: 6,
    borderRadius: borderRadius.md,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  navBtnDisabled: {
    opacity: 0.35,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    padding: 10,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  summaryVal: {
    fontSize: 17,
    fontWeight: typography.weights.bold,
  },
  summaryLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },

  /* ── Search & Filter ── */
  searchAndFilters: {
    gap: 10,
    marginVertical: 4,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 13,
    color: colors.text,
  },
  filterChipsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.primary,
  },

  /* ── Monthly Rows List ── */
  rowsList: {
    gap: 12,
  },
  staffAttendanceCard: {
    padding: 14,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  staffHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  avatarText: {
    fontSize: 13,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  staffInfo: {
    flex: 1,
  },
  staffNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  staffName: {
    fontSize: 14,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  staffCode: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  rateBadge: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  rateBadgeText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: '#16A34A',
  },
  countsGrid: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: borderRadius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  countCol: {
    flex: 1,
    alignItems: 'center',
  },
  countNum: {
    fontSize: 14,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  countText: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    width: 1,
    backgroundColor: '#E2E8F0',
  },
  cardFooterHint: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  inspectHintText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: typography.weights.medium,
  },

  /* ── Empty Card ── */
  emptyCard: {
    padding: 32,
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    marginTop: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginTop: 10,
  },
  emptySub: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
    paddingHorizontal: 12,
  },

  /* ── Modal Calendar Inspector ── */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCardLarge: {
    padding: 18,
    borderRadius: borderRadius.xl,
    maxHeight: '92%',
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
  },
  modalSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  modalSummaryStrip: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
  },
  modalPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 7,
    borderRadius: borderRadius.md,
  },
  modalPillNum: {
    fontSize: 14,
    fontWeight: typography.weights.bold,
  },
  modalPillText: {
    fontSize: 9,
    color: colors.textSecondary,
    marginTop: 1,
  },
  calendarSectionTitle: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  calendarCard: {
    padding: 12,
    borderRadius: borderRadius.lg,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  calendarHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 6,
  },
  calendarHeaderText: {
    width: 36,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: colors.textSecondary,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarCellEmpty: {
    width: '14.28%',
    height: 40,
  },
  calendarCell: {
    width: '14.28%',
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  calendarCellSelected: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  calendarCellNum: {
    fontSize: 12,
    fontWeight: typography.weights.medium,
    color: '#0F172A',
  },
  calendarCellNumSelected: {
    color: colors.primary,
    fontWeight: typography.weights.bold,
  },
  calendarStatusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 2,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  dayInspectorBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: borderRadius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dayInspectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  dayInspectorDate: {
    fontSize: 13,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
  },
  dayInspectorWeekday: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  dayStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  dayStatusBadgeText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
  punchTimesBox: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  punchCol: {
    flex: 1,
    alignItems: 'center',
  },
  punchLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  punchLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  punchTimeVal: {
    fontSize: 13,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
  },
  punchLocVal: {
    fontSize: 9,
    color: colors.textMuted,
    marginTop: 1,
  },
  punchDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
  },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    padding: 10,
    borderRadius: borderRadius.md,
  },
  noteBoxText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: typography.weights.medium,
  },
  noPunchText: {
    fontSize: 11,
    color: colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 6,
  },
});
