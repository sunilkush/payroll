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
  finalizePayrollApi,
  generatePayrollApi,
  listPayrollApi,
  updatePayrollApi,
} from '../../api/payrollApi.js';
import Alert from '../../components/common/Alert.jsx';
import Badge from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import Header from '../../components/common/Header.jsx';
import Input from '../../components/common/Input.jsx';
import Loader from '../../components/common/Loader.jsx';
import ScreenWrapper from '../../components/common/ScreenWrapper.jsx';
import { borderRadius, colors, shadows, typography } from '../../theme/index.js';
import { currentMonth, formatCurrency, formatMonth } from '../../utils/format.js';
import { initials } from '../../utils/roles.js';

export default function AdminPayrollScreen({ navigation }) {
  const [month, setMonth] = useState(currentMonth());
  const [activeTab, setActiveTab] = useState('SLIPS'); // 'SLIPS' | 'SUMMARY' | 'HISTORY'
  const [data, setData] = useState({
    rows: [],
    totals: null,
    hasDraft: false,
    monthCompleted: false,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: 'success', text: '' });

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'DRAFT' | 'FINAL'

  // Slip Inspector & Edit Modal State
  const [selectedSlip, setSelectedSlip] = useState(null);
  const [editOtherDeductions, setEditOtherDeductions] = useState('0');
  const [editRemarks, setEditRemarks] = useState('');
  const [updatingSlip, setUpdatingSlip] = useState(false);

  const fetchPayroll = useCallback(async (targetMonth) => {
    try {
      setFeedback({ type: 'success', text: '' });
      const res = await listPayrollApi(targetMonth);
      setData(
        res?.data || {
          rows: [],
          totals: null,
          hasDraft: false,
          monthCompleted: false,
        }
      );
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err.message || 'Failed to load payroll for this month.',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPayroll(month);
  }, [fetchPayroll, month]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPayroll(month);
  };

  const handleProcessPayroll = async () => {
    setActionLoading(true);
    setFeedback({ type: 'success', text: '' });
    try {
      const res = await generatePayrollApi(month);
      setData(res?.data || data);
      setFeedback({
        type: 'success',
        text: `Payroll computed successfully for ${formatMonth(month)}.`,
      });
      fetchPayroll(month);
      setTimeout(() => setFeedback({ type: 'success', text: '' }), 4000);
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err.message || 'Failed to generate payroll.',
      });
      NativeAlert.alert('Processing Error', err.message || 'Unable to compute payroll.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFinalize = () => {
    if (!data.monthCompleted) {
      NativeAlert.alert(
        'Month Still Active',
        `Payroll for ${formatMonth(month)} can only be finalized once the month ends, so that complete attendance is locked.`
      );
      return;
    }

    NativeAlert.alert(
      `Finalize Payroll for ${formatMonth(month)}?`,
      'Once finalized, all salary slips will be permanently locked and published to staff mobile profiles.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Finalize & Publish',
          style: 'default',
          onPress: async () => {
            setActionLoading(true);
            try {
              const res = await finalizePayrollApi(month);
              setData(res?.data || data);
              setFeedback({
                type: 'success',
                text: `Payroll for ${formatMonth(month)} has been finalized and slips are published!`,
              });
              fetchPayroll(month);
              setTimeout(() => setFeedback({ type: 'success', text: '' }), 5000);
            } catch (err) {
              setFeedback({
                type: 'error',
                text: err.message || 'Failed to finalize payroll.',
              });
              NativeAlert.alert('Finalize Error', err.message || 'Could not finalize payroll.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
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

  const rows = data.rows || [];
  const totals = data.totals || {};
  const hasRows = rows.length > 0;
  const isCurrentOrPast = month <= currentMonth();
  const canGoNext = month < currentMonth();

  // Metrics
  const grossAmount = totals.earnedGross ?? totals.gross ?? 0;
  const deductionsAmount = totals.deductions ?? 0;
  const netAmount = totals.netSalary ?? totals.net ?? 0;
  const employerAmount = totals.employerContribution ?? 0;
  const totalCtc = grossAmount + employerAmount;

  // Search & Filter Rows
  const filteredRows = useMemo(() => {
    return rows.filter((slip) => {
      const q = searchQuery.trim().toLowerCase();
      const matchQuery =
        !q ||
        slip.staff?.name?.toLowerCase().includes(q) ||
        slip.staff?.employeeCode?.toLowerCase().includes(q);

      const matchStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'DRAFT' && slip.status !== 'final') ||
        (statusFilter === 'FINAL' && slip.status === 'final');

      return matchQuery && matchStatus;
    });
  }, [rows, searchQuery, statusFilter]);

  const draftCount = useMemo(() => rows.filter((r) => r.status !== 'final').length, [rows]);
  const finalCount = useMemo(() => rows.filter((r) => r.status === 'final').length, [rows]);

  const openSlipDetails = (slip) => {
    setSelectedSlip(slip);
    setEditOtherDeductions(String(slip.deductions?.other || 0));
    setEditRemarks(slip.remarks || '');
  };

  const handleUpdateSlip = async () => {
    if (!selectedSlip) return;
    setUpdatingSlip(true);
    try {
      await updatePayrollApi(selectedSlip._id, {
        otherDeductions: Number(editOtherDeductions) || 0,
        remarks: editRemarks,
      });
      NativeAlert.alert('Slip Updated', 'Other deductions and remarks saved successfully.');
      setSelectedSlip(null);
      fetchPayroll(month);
    } catch (err) {
      NativeAlert.alert('Update Failed', err.message || 'Could not update salary slip.');
    } finally {
      setUpdatingSlip(false);
    }
  };

  const recentHistory = useMemo(() => {
    const now = new Date();
    return [1, 2, 3, 4, 5].map((offset) => {
      const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      return {
        key: mStr,
        monthLabel: formatMonth(mStr),
        dateLabel: `${lastDay} ${d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}`,
        isCurrentSelected: mStr === month,
      };
    });
  }, [month]);

  if (loading) {
    return <Loader message="Loading payroll records..." />;
  }

  return (
    <ScreenWrapper
      contentContainerStyle={styles.container}
      scrollable
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
    >
      <Header
        title="Payroll Processing"
        onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
        rightIcon="refresh"
        onRightPress={onRefresh}
      />

      {feedback.text ? (
        <Alert type={feedback.type} style={styles.topAlert}>
          {feedback.text}
        </Alert>
      ) : null}

      {/* ── 1. Month Navigator Card ── */}
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
          <View style={styles.periodStatusRow}>
            {hasRows ? (
              data.hasDraft ? (
                <View style={styles.draftBadge}>
                  <View style={styles.amberDot} />
                  <Text style={styles.draftBadgeText}>Draft in Review ({draftCount})</Text>
                </View>
              ) : (
                <View style={styles.finalBadge}>
                  <MaterialCommunityIcons name="check-decagram" size={13} color="#16A34A" />
                  <Text style={styles.finalBadgeText}>Finalized & Published</Text>
                </View>
              )
            ) : (
              <View style={styles.uncomputedBadge}>
                <Text style={styles.uncomputedBadgeText}>Not Computed</Text>
              </View>
            )}
          </View>
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

      {/* ── 2. Executive KPI Hero Banner ── */}
      <Card style={styles.kpiHeroCard} elevation="sm">
        <View style={styles.kpiTopRow}>
          <View>
            <Text style={styles.kpiHeroLabel}>Net Salary Distribution</Text>
            <Text style={styles.kpiHeroValue}>{formatCurrency(netAmount)}</Text>
          </View>
          <View style={styles.kpiIconCircle}>
            <MaterialCommunityIcons name="cash-multiple" size={26} color="#FFFFFF" />
          </View>
        </View>

        <View style={styles.kpiDivider} />

        <View style={styles.kpiMetricsGrid}>
          <View style={styles.kpiMetricItem}>
            <Text style={styles.kpiMetricSub}>Employees</Text>
            <View style={styles.kpiMetricValRow}>
              <MaterialCommunityIcons name="account-group" size={14} color={colors.primary} />
              <Text style={styles.kpiMetricVal}>{rows.length}</Text>
            </View>
          </View>

          <View style={styles.kpiMetricItem}>
            <Text style={styles.kpiMetricSub}>Earned Gross</Text>
            <Text style={styles.kpiMetricVal}>{formatCurrency(grossAmount)}</Text>
          </View>

          <View style={styles.kpiMetricItem}>
            <Text style={styles.kpiMetricSub}>Deductions</Text>
            <Text style={[styles.kpiMetricVal, { color: colors.danger }]}>
              -{formatCurrency(deductionsAmount)}
            </Text>
          </View>
        </View>

        {employerAmount > 0 && (
          <View style={styles.employerBurdenRow}>
            <MaterialCommunityIcons name="shield-account" size={14} color="#7C3AED" />
            <Text style={styles.employerBurdenText}>
              Employer Statutory Share (PF+ESI):{' '}
              <Text style={{ fontWeight: typography.weights.bold }}>{formatCurrency(employerAmount)}</Text>
              {'  •  '}CTC: <Text style={{ fontWeight: typography.weights.bold }}>{formatCurrency(totalCtc)}</Text>
            </Text>
          </View>
        )}
      </Card>

      {/* ── 3. Quick Payroll Actions ── */}
      <View style={styles.actionBlock}>
        {!hasRows ? (
          <Button
            title={actionLoading ? 'Calculating Payroll...' : 'Compute & Generate Payroll'}
            onPress={handleProcessPayroll}
            loading={actionLoading}
            icon="calculator-variant"
            style={styles.primaryActionBtn}
          />
        ) : (
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              style={styles.recomputeBtn}
              onPress={handleProcessPayroll}
              disabled={actionLoading}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="refresh" size={18} color={colors.primary} />
              <Text style={styles.recomputeBtnText}>
                {actionLoading ? 'Computing...' : 'Recalculate'}
              </Text>
            </TouchableOpacity>

            {data.hasDraft && (
              <TouchableOpacity
                style={[
                  styles.finalizeBtn,
                  !data.monthCompleted && styles.finalizeBtnInactive,
                ]}
                onPress={handleFinalize}
                disabled={actionLoading}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="check-circle-outline" size={18} color="#FFFFFF" />
                <Text style={styles.finalizeBtnText}>
                  {actionLoading ? 'Publishing...' : 'Finalize & Publish'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {hasRows && data.hasDraft && !data.monthCompleted && (
          <Text style={styles.monthInProgressNote}>
            ℹ️ Finalization unlocks once the month ends, so attendance records are completely finalized.
          </Text>
        )}
      </View>

      {/* ── 4. Interactive Tabs Bar ── */}
      <View style={styles.tabsBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'SLIPS' && styles.tabItemActive]}
          onPress={() => setActiveTab('SLIPS')}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="account-details-outline"
            size={16}
            color={activeTab === 'SLIPS' ? colors.primary : colors.textSecondary}
          />
          <Text style={[styles.tabItemText, activeTab === 'SLIPS' && styles.tabItemTextActive]}>
            Staff Slips ({rows.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'SUMMARY' && styles.tabItemActive]}
          onPress={() => setActiveTab('SUMMARY')}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="chart-pie"
            size={16}
            color={activeTab === 'SUMMARY' ? colors.primary : colors.textSecondary}
          />
          <Text style={[styles.tabItemText, activeTab === 'SUMMARY' && styles.tabItemTextActive]}>
            Summary
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'HISTORY' && styles.tabItemActive]}
          onPress={() => setActiveTab('HISTORY')}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="history"
            size={16}
            color={activeTab === 'HISTORY' ? colors.primary : colors.textSecondary}
          />
          <Text style={[styles.tabItemText, activeTab === 'HISTORY' && styles.tabItemTextActive]}>
            Archive
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── TAB 1: Staff Slips Feed (Direct on Main Screen!) ── */}
      {activeTab === 'SLIPS' && (
        <View style={styles.tabContent}>
          {hasRows && (
            <View style={styles.searchAndFilters}>
              {/* Search Bar */}
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

              {/* Status Filters */}
              <View style={styles.filterChipsRow}>
                {[
                  { id: 'ALL', label: `All (${rows.length})` },
                  { id: 'DRAFT', label: `Draft (${draftCount})` },
                  { id: 'FINAL', label: `Final (${finalCount})` },
                ].map((chip) => {
                  const isSel = statusFilter === chip.id;
                  return (
                    <TouchableOpacity
                      key={chip.id}
                      style={[styles.filterChip, isSel && styles.filterChipActive]}
                      onPress={() => setStatusFilter(chip.id)}
                    >
                      <Text style={[styles.filterChipText, isSel && styles.filterChipTextActive]}>
                        {chip.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {!hasRows ? (
            <Card style={styles.emptyCard} elevation="xs">
              <View style={styles.emptyIconCircle}>
                <MaterialCommunityIcons name="calculator" size={38} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>Payroll Not Generated Yet</Text>
              <Text style={styles.emptySub}>
                Click the "Compute & Generate Payroll" button above to automatically calculate attendance, LOP days, and monthly earnings.
              </Text>
            </Card>
          ) : filteredRows.length === 0 ? (
            <Card style={styles.emptyCard} elevation="xs">
              <MaterialCommunityIcons name="account-search-outline" size={36} color={colors.textSecondary} />
              <Text style={styles.emptyTitle}>No matching employees</Text>
              <Text style={styles.emptySub}>Try searching with a different name or employee code.</Text>
            </Card>
          ) : (
            <View style={styles.slipsList}>
              {filteredRows.map((slip) => {
                const isFinal = slip.status === 'final';
                const staffName = slip.staff?.name || 'Staff Member';
                const empCode = slip.staff?.employeeCode || 'EMP';
                const payable = slip.payableDays ?? 30;
                const lop = slip.lopDays ?? 0;

                return (
                  <Card key={slip._id} style={styles.slipCard} elevation="xs">
                    <TouchableOpacity
                      onPress={() => openSlipDetails(slip)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.slipCardHeader}>
                        <View style={styles.slipAvatar}>
                          <Text style={styles.slipAvatarText}>{initials(staffName)}</Text>
                        </View>
                        <View style={styles.slipStaffInfo}>
                          <Text style={styles.slipStaffName}>{staffName}</Text>
                          <Text style={styles.slipStaffCode}>{empCode}</Text>
                        </View>
                        <Badge
                          label={isFinal ? 'FINAL' : 'DRAFT'}
                          variant={isFinal ? 'success' : 'warning'}
                          size="sm"
                        />
                      </View>

                      {/* Attendance & Days Metrics */}
                      <View style={styles.slipAttendanceRow}>
                        <View style={styles.payableChip}>
                          <MaterialCommunityIcons name="calendar-check" size={13} color="#16A34A" />
                          <Text style={styles.payableChipText}>{payable}/30 Payable Days</Text>
                        </View>
                        {lop > 0 && (
                          <View style={styles.lopChip}>
                            <MaterialCommunityIcons name="calendar-remove" size={13} color="#DC2626" />
                            <Text style={styles.lopChipText}>{lop} LOP Days</Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.slipDivider} />

                      {/* Financial Metrics Strip */}
                      <View style={styles.slipFinanceRow}>
                        <View>
                          <Text style={styles.slipGrossMini}>
                            Gross: {formatCurrency(slip.earnings?.gross || 0)}
                          </Text>
                          <Text style={styles.slipDedMini}>
                            Ded: -{formatCurrency(slip.deductions?.total || 0)}
                          </Text>
                        </View>

                        <View style={styles.slipNetContainer}>
                          <Text style={styles.slipNetLabel}>Net Take-Home</Text>
                          <Text style={styles.slipNetVal}>{formatCurrency(slip.netSalary)}</Text>
                        </View>
                      </View>

                      {/* Quick Action Footer */}
                      <View style={styles.slipCardFooter}>
                        <Text style={styles.slipViewDetailsText}>Tap to inspect breakdown</Text>
                        <MaterialCommunityIcons name="chevron-right" size={16} color={colors.primary} />
                      </View>
                    </TouchableOpacity>
                  </Card>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* ── TAB 2: Financial Summary & Statutory Deep Dive ── */}
      {activeTab === 'SUMMARY' && (
        <View style={styles.tabContent}>
          <Card style={styles.summaryCard} elevation="xs">
            <Text style={styles.summarySectionTitle}>Gross Earnings Breakdown</Text>
            <View style={styles.breakdownBox}>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Total Earned Gross</Text>
                <Text style={styles.breakdownValBold}>{formatCurrency(grossAmount)}</Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Employees on Payroll</Text>
                <Text style={styles.breakdownVal}>{rows.length} Staff</Text>
              </View>
            </View>

            <Text style={[styles.summarySectionTitle, { marginTop: 16 }]}>
              Employee Statutory & Other Deductions
            </Text>
            <View style={styles.breakdownBox}>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Employee PF Share (12%)</Text>
                <Text style={styles.breakdownVal}>{formatCurrency(totals.pf || 0)}</Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Employee ESI Share (0.75%)</Text>
                <Text style={styles.breakdownVal}>{formatCurrency(totals.esi || 0)}</Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Other Adjustments / Deductions</Text>
                <Text style={styles.breakdownVal}>{formatCurrency(totals.other || 0)}</Text>
              </View>
              <View style={[styles.breakdownRow, styles.breakdownRowTotal]}>
                <Text style={styles.breakdownLabelBold}>Total Deductions Subtracted</Text>
                <Text style={[styles.breakdownValBold, { color: colors.danger }]}>
                  -{formatCurrency(deductionsAmount)}
                </Text>
              </View>
            </View>

            <Text style={[styles.summarySectionTitle, { marginTop: 16 }]}>
              Employer Statutory Contributions
            </Text>
            <View style={styles.breakdownBox}>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Employer Statutory Share (PF + ESI)</Text>
                <Text style={[styles.breakdownValBold, { color: '#7C3AED' }]}>
                  {formatCurrency(employerAmount)}
                </Text>
              </View>
            </View>

            <View style={styles.netHighlightBox}>
              <View>
                <Text style={styles.netHighlightLabel}>Total Net Payroll Disbursed</Text>
                <Text style={styles.netHighlightSub}>Direct transfer to staff bank accounts</Text>
              </View>
              <Text style={styles.netHighlightVal}>{formatCurrency(netAmount)}</Text>
            </View>
          </Card>
        </View>
      )}

      {/* ── TAB 3: Payroll Archive ── */}
      {activeTab === 'HISTORY' && (
        <View style={styles.tabContent}>
          <Text style={styles.historyHeading}>Recent Payroll Archive</Text>
          <View style={styles.historyList}>
            {recentHistory.map((item) => (
              <TouchableOpacity
                key={item.key}
                style={[styles.historyCard, item.isCurrentSelected && styles.historyCardActive]}
                onPress={() => {
                  setMonth(item.key);
                  setActiveTab('SLIPS');
                }}
                activeOpacity={0.8}
              >
                <View style={styles.historyLeft}>
                  <View
                    style={[
                      styles.historyIconCircle,
                      item.isCurrentSelected && { backgroundColor: colors.primary },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="calendar-month"
                      size={20}
                      color={item.isCurrentSelected ? '#FFFFFF' : colors.primary}
                    />
                  </View>
                  <View>
                    <Text style={styles.historyMonth}>{item.monthLabel}</Text>
                    <Text style={styles.historyDate}>Closed on {item.dateLabel}</Text>
                  </View>
                </View>

                <View style={styles.historyRight}>
                  {item.isCurrentSelected ? (
                    <Badge label="Viewing" variant="primary" size="sm" />
                  ) : (
                    <View style={styles.viewMonthBtn}>
                      <Text style={styles.viewMonthBtnText}>View Slips</Text>
                      <MaterialCommunityIcons name="arrow-right" size={14} color={colors.primary} />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* ── 5. Salary Slip Inspector & Deduction Editor Modal ── */}
      <Modal
        visible={Boolean(selectedSlip)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedSlip(null)}
      >
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCard} elevation="lg">
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>{selectedSlip?.staff?.name || 'Salary Slip'}</Text>
                <Text style={styles.modalSub}>
                  {selectedSlip?.staff?.employeeCode || 'EMP'} • {formatMonth(month)}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedSlip(null)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialCommunityIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Employee & Bank Info Pill */}
              <View style={styles.empBankPill}>
                <View style={styles.empBankRow}>
                  <Text style={styles.empBankLabel}>Bank A/C:</Text>
                  <Text style={styles.empBankVal}>
                    {selectedSlip?.staff?.bankName || 'Bank'} •{' '}
                    {selectedSlip?.staff?.accountNo ? `••••${selectedSlip.staff.accountNo.slice(-4)}` : 'Not set'}
                  </Text>
                </View>
                {selectedSlip?.staff?.ifsc ? (
                  <View style={styles.empBankRow}>
                    <Text style={styles.empBankLabel}>IFSC:</Text>
                    <Text style={styles.empBankVal}>{selectedSlip.staff.ifsc}</Text>
                  </View>
                ) : null}
                {selectedSlip?.staff?.uan ? (
                  <View style={styles.empBankRow}>
                    <Text style={styles.empBankLabel}>UAN (PF):</Text>
                    <Text style={styles.empBankVal}>{selectedSlip.staff.uan}</Text>
                  </View>
                ) : null}
              </View>

              {/* Attendance Breakdown */}
              <View style={styles.modalAttendanceBox}>
                <View style={styles.modalAttendanceItem}>
                  <Text style={styles.modalAttendanceNum}>{selectedSlip?.payableDays ?? 30}</Text>
                  <Text style={styles.modalAttendanceLabel}>Payable Days</Text>
                </View>
                <View style={styles.modalAttendanceDivider} />
                <View style={styles.modalAttendanceItem}>
                  <Text
                    style={[
                      styles.modalAttendanceNum,
                      { color: (selectedSlip?.lopDays || 0) > 0 ? colors.danger : colors.text },
                    ]}
                  >
                    {selectedSlip?.lopDays ?? 0}
                  </Text>
                  <Text style={styles.modalAttendanceLabel}>Loss of Pay (LOP)</Text>
                </View>
              </View>

              {/* Earnings Breakdown */}
              <Text style={styles.modalSectionTitle}>Monthly Earnings</Text>
              <View style={styles.breakdownBox}>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Basic Salary</Text>
                  <Text style={styles.breakdownVal}>
                    {formatCurrency(selectedSlip?.earnings?.basic || 0)}
                  </Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>House Rent Allowance (HRA)</Text>
                  <Text style={styles.breakdownVal}>
                    {formatCurrency(selectedSlip?.earnings?.hra || 0)}
                  </Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Special Allowance</Text>
                  <Text style={styles.breakdownVal}>
                    {formatCurrency(selectedSlip?.earnings?.special || 0)}
                  </Text>
                </View>
                <View style={[styles.breakdownRow, styles.breakdownRowTotal]}>
                  <Text style={styles.breakdownLabelBold}>Earned Gross</Text>
                  <Text style={styles.breakdownValBold}>
                    {formatCurrency(selectedSlip?.earnings?.gross || 0)}
                  </Text>
                </View>
              </View>

              {/* Deductions Breakdown */}
              <Text style={styles.modalSectionTitle}>Deductions Subtracted</Text>
              <View style={styles.breakdownBox}>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Provident Fund (PF Employee)</Text>
                  <Text style={styles.breakdownVal}>
                    {formatCurrency(selectedSlip?.deductions?.pf || 0)}
                  </Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>ESI (Employee Share)</Text>
                  <Text style={styles.breakdownVal}>
                    {formatCurrency(selectedSlip?.deductions?.esi || 0)}
                  </Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Other Deductions (Advance/Fine)</Text>
                  <Text style={styles.breakdownVal}>
                    {formatCurrency(selectedSlip?.deductions?.other || 0)}
                  </Text>
                </View>
                <View style={[styles.breakdownRow, styles.breakdownRowTotal]}>
                  <Text style={styles.breakdownLabelBold}>Total Deductions</Text>
                  <Text style={[styles.breakdownValBold, { color: colors.danger }]}>
                    -{formatCurrency(selectedSlip?.deductions?.total || 0)}
                  </Text>
                </View>
              </View>

              {/* Net Take-Home Highlight */}
              <View style={styles.netHighlightBox}>
                <View>
                  <Text style={styles.netHighlightLabel}>Net Take-Home Salary</Text>
                  <Text style={styles.netHighlightSub}>Payable for {formatMonth(month)}</Text>
                </View>
                <Text style={styles.netHighlightVal}>
                  {formatCurrency(selectedSlip?.netSalary || 0)}
                </Text>
              </View>

              {/* Edit Section for Draft slips */}
              {selectedSlip?.status !== 'final' ? (
                <View style={styles.editSection}>
                  <Text style={styles.modalSectionTitle}>Adjust Deductions (Draft)</Text>
                  <Input
                    label="Other Deductions (₹)"
                    value={editOtherDeductions}
                    onChangeText={setEditOtherDeductions}
                    keyboardType="numeric"
                    placeholder="0"
                    helper="Salary advance recovery, loan installment, or fines"
                    prefixIcon="cash-minus"
                  />
                  <Input
                    label="Admin Remarks"
                    value={editRemarks}
                    onChangeText={setEditRemarks}
                    placeholder="e.g. Salary advance recovered"
                    prefixIcon="comment-text-outline"
                  />
                  <Button
                    title={updatingSlip ? 'Saving...' : 'Update Salary Slip'}
                    onPress={handleUpdateSlip}
                    disabled={updatingSlip}
                    loading={updatingSlip}
                    style={{ marginTop: 8 }}
                    icon="content-save-outline"
                  />
                </View>
              ) : (
                <View style={styles.finalizedNote}>
                  <MaterialCommunityIcons name="check-decagram" size={20} color={colors.success} />
                  <Text style={styles.finalizedNoteText}>
                    This salary slip has been finalized and published. Locked from further editing.
                  </Text>
                </View>
              )}

              <Button
                title="Close"
                variant="outline"
                onPress={() => setSelectedSlip(null)}
                style={{ marginTop: 12, marginBottom: 12 }}
              />
            </ScrollView>
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
    marginBottom: 14,
  },

  /* ── 1. Month Navigator ── */
  monthNavCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
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
  periodStatusRow: {
    marginTop: 4,
  },
  draftBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  amberDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D97706',
  },
  draftBadgeText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: '#D97706',
  },
  finalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  finalBadgeText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: '#16A34A',
  },
  uncomputedBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  uncomputedBadgeText: {
    fontSize: 10,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
  },
  navBtn: {
    padding: 6,
    borderRadius: borderRadius.md,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  navBtnDisabled: {
    opacity: 0.4,
  },

  /* ── 2. KPI Hero Card ── */
  kpiHeroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  kpiTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  kpiHeroLabel: {
    fontSize: 12,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  kpiHeroValue: {
    fontSize: 26,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
  },
  kpiIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  kpiMetricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  kpiMetricItem: {
    flex: 1,
  },
  kpiMetricSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  kpiMetricValRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  kpiMetricVal: {
    fontSize: 14,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
  },
  employerBurdenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FAF5FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#F3E8FF',
  },
  employerBurdenText: {
    fontSize: 11,
    color: '#6B21A8',
  },

  /* ── 3. Quick Action Bar ── */
  actionBlock: {
    marginBottom: 16,
  },
  primaryActionBtn: {
    borderRadius: borderRadius.pill,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  recomputeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingVertical: 13,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  recomputeBtnText: {
    fontSize: 13,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  finalizeBtn: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#16A34A',
    paddingVertical: 13,
    borderRadius: borderRadius.pill,
    elevation: 2,
  },
  finalizeBtnInactive: {
    backgroundColor: '#94A3B8',
  },
  finalizeBtnText: {
    fontSize: 13,
    fontWeight: typography.weights.bold,
    color: '#FFFFFF',
  },
  monthInProgressNote: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 16,
    paddingHorizontal: 8,
  },

  /* ── 4. Interactive Tabs ── */
  tabsBar: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: borderRadius.pill,
    padding: 3,
    marginBottom: 14,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: borderRadius.pill,
  },
  tabItemActive: {
    backgroundColor: '#FFFFFF',
    elevation: 1,
  },
  tabItemText: {
    fontSize: 12,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
  },
  tabItemTextActive: {
    color: colors.primary,
    fontWeight: typography.weights.bold,
  },

  /* ── Tab Content ── */
  tabContent: {
    gap: 12,
  },

  /* ── Search & Filter ── */
  searchAndFilters: {
    gap: 10,
    marginBottom: 4,
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

  /* ── Staff Slip Cards ── */
  slipsList: {
    gap: 10,
  },
  slipCard: {
    padding: 14,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  slipCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  slipAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  slipAvatarText: {
    fontSize: 13,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  slipStaffInfo: {
    flex: 1,
  },
  slipStaffName: {
    fontSize: 14,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
  },
  slipStaffCode: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  slipAttendanceRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  payableChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  payableChipText: {
    fontSize: 10,
    fontWeight: typography.weights.semibold,
    color: '#16A34A',
  },
  lopChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  lopChipText: {
    fontSize: 10,
    fontWeight: typography.weights.semibold,
    color: '#DC2626',
  },
  slipDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
  },
  slipFinanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  slipGrossMini: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  slipDedMini: {
    fontSize: 11,
    color: colors.danger,
    marginTop: 1,
  },
  slipNetContainer: {
    alignItems: 'flex-end',
  },
  slipNetLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  slipNetVal: {
    fontSize: 16,
    fontWeight: typography.weights.bold,
    color: colors.primary,
    marginTop: 1,
  },
  slipCardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 2,
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  slipViewDetailsText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: typography.weights.medium,
  },

  /* ── Empty Card ── */
  emptyCard: {
    padding: 30,
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    marginTop: 8,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
  },
  emptySub: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    paddingHorizontal: 12,
  },

  /* ── Summary Card ── */
  summaryCard: {
    padding: 16,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  summarySectionTitle: {
    fontSize: 13,
    fontWeight: typography.weights.bold,
    color: '#334155',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  /* ── History Archive ── */
  historyHeading: {
    fontSize: 14,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
    marginBottom: 6,
  },
  historyList: {
    gap: 10,
  },
  historyCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: borderRadius.lg,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  historyCardActive: {
    borderColor: colors.primary,
    backgroundColor: '#F8FAFC',
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  historyIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyMonth: {
    fontSize: 14,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
  },
  historyDate: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  historyRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewMonthBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
  },
  viewMonthBtnText: {
    fontSize: 11,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
  },

  /* ── Modal Pay Voucher ── */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    padding: 20,
    borderRadius: borderRadius.xl,
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
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
  empBankPill: {
    backgroundColor: '#F8FAFC',
    borderRadius: borderRadius.md,
    padding: 10,
    gap: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  empBankRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  empBankLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  empBankVal: {
    fontSize: 11,
    fontWeight: typography.weights.semibold,
    color: '#0F172A',
  },
  modalAttendanceBox: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: borderRadius.md,
    paddingVertical: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalAttendanceItem: {
    flex: 1,
    alignItems: 'center',
  },
  modalAttendanceDivider: {
    width: 1,
    backgroundColor: '#CBD5E1',
  },
  modalAttendanceNum: {
    fontSize: 18,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
  },
  modalAttendanceLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  modalSectionTitle: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
    color: '#475569',
    marginBottom: 6,
    marginTop: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  breakdownBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: borderRadius.md,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownRowTotal: {
    borderTopWidth: 1,
    borderTopColor: '#CBD5E1',
    paddingTop: 8,
    marginTop: 4,
  },
  breakdownLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  breakdownVal: {
    fontSize: 12,
    fontWeight: typography.weights.medium,
    color: '#0F172A',
  },
  breakdownLabelBold: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
  },
  breakdownValBold: {
    fontSize: 13,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
  },
  netHighlightBox: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    borderRadius: borderRadius.lg,
    padding: 14,
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  netHighlightLabel: {
    fontSize: 13,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
  },
  netHighlightSub: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },
  netHighlightVal: {
    fontSize: 19,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  editSection: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  finalizedNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#DCFCE7',
    marginTop: 14,
  },
  finalizedNoteText: {
    fontSize: 12,
    color: '#16A34A',
    flex: 1,
    fontWeight: typography.weights.medium,
  },
});
