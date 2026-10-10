import { useCallback, useEffect, useState } from 'react';
import {
  Alert as NativeAlert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
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
  const [searchQuery, setSearchQuery] = useState('');

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

  const handlePrevMonth = () => {
    const [y, m] = month.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    setMonth(`${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [y, m] = month.split('-').map(Number);
    const nextDate = new Date(y, m, 1);
    const nextStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
    if (nextStr <= currentMonth()) {
      setMonth(nextStr);
    }
  };

  const handleGenerate = async () => {
    setActionLoading(true);
    try {
      const res = await generatePayrollApi(month);
      setData(res?.data || data);
      setFeedback({
        type: 'success',
        text: `Payroll generated/recomputed for ${formatMonth(month)}.`,
      });
      fetchPayroll(month);
      setTimeout(() => setFeedback({ type: 'success', text: '' }), 4000);
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err.message || 'Failed to generate payroll.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleFinalize = () => {
    if (!data.monthCompleted) {
      NativeAlert.alert(
        'Month Not Completed',
        `Payroll for ${formatMonth(month)} can only be finalized after the month has concluded. You can still generate and adjust drafts now.`
      );
      return;
    }

    NativeAlert.alert(
      `Finalize Payroll for ${formatMonth(month)}?`,
      'Once finalized, salary slips will be published to staff profiles and cannot be recomputed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Finalize Now',
          style: 'default',
          onPress: async () => {
            setActionLoading(true);
            try {
              const res = await finalizePayrollApi(month);
              setData(res?.data || data);
              setFeedback({
                type: 'success',
                text: `Payroll for ${formatMonth(month)} has been finalized! Slips are now visible to staff.`,
              });
              fetchPayroll(month);
              setTimeout(() => setFeedback({ type: 'success', text: '' }), 5000);
            } catch (err) {
              setFeedback({
                type: 'error',
                text: err.message || 'Failed to finalize payroll.',
              });
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const openSlipModal = (slip) => {
    setSelectedSlip(slip);
    setEditOtherDeductions(String(slip?.deductions?.other ?? 0));
    setEditRemarks(slip?.remarks || '');
  };

  const handleSaveSlipAdjustments = async () => {
    if (!selectedSlip) return;
    setUpdatingSlip(true);
    try {
      const payload = {
        otherDeductions: Number(editOtherDeductions) || 0,
        remarks: editRemarks.trim(),
      };
      await updatePayrollApi(selectedSlip._id, payload);
      setFeedback({
        type: 'success',
        text: `Updated deductions & remarks for ${selectedSlip.staff?.name}.`,
      });
      setSelectedSlip(null);
      fetchPayroll(month);
      setTimeout(() => setFeedback({ type: 'success', text: '' }), 4000);
    } catch (err) {
      NativeAlert.alert('Error', err.message || 'Failed to update slip.');
    } finally {
      setUpdatingSlip(false);
    }
  };

  const isNextDisabled = month >= currentMonth();
  const rows = data.rows || [];
  const totals = data.totals || {};

  const filteredRows = rows.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.staff?.name?.toLowerCase().includes(q) ||
      r.staff?.employeeCode?.toLowerCase().includes(q)
    );
  });

  return (
    <ScreenWrapper scrollable={false}>
      <Header
        title="Monthly Payroll"
        subtitle="Generate, adjust and finalize salaries"
        canGoBack
        onBackPress={() => navigation.goBack()}
      />

      {feedback.text ? (
        <View style={styles.alertWrapper}>
          <Alert
            type={feedback.type}
            message={feedback.text}
            onDismiss={() => setFeedback({ type: 'success', text: '' })}
          />
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Month Selector Card */}
        <Card style={styles.monthCard} elevation="sm">
          <TouchableOpacity
            style={styles.monthNavBtn}
            onPress={handlePrevMonth}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialCommunityIcons name="chevron-left" size={28} color={colors.primary} />
          </TouchableOpacity>

          <View style={styles.monthDisplay}>
            <MaterialCommunityIcons name="calendar-month-outline" size={20} color={colors.primary} />
            <Text style={styles.monthLabel}>{formatMonth(month)}</Text>
          </View>

          <TouchableOpacity
            style={[styles.monthNavBtn, isNextDisabled && styles.monthNavDisabled]}
            onPress={handleNextMonth}
            disabled={isNextDisabled}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialCommunityIcons
              name="chevron-right"
              size={28}
              color={isNextDisabled ? colors.textMuted : colors.primary}
            />
          </TouchableOpacity>
        </Card>

        {/* Action Controls */}
        <View style={styles.actionRow}>
          <Button
            title={rows.length > 0 ? 'Recompute Drafts' : 'Generate Payroll'}
            onPress={handleGenerate}
            loading={actionLoading}
            icon="calculator-variant-outline"
            style={styles.actionBtn}
          />

          <Button
            title="Finalize Month"
            variant="success"
            onPress={handleFinalize}
            loading={actionLoading}
            disabled={!data.hasDraft || rows.length === 0}
            icon="check-decagram-outline"
            style={styles.actionBtn}
          />
        </View>

        {/* Status Notice */}
        {!data.monthCompleted && rows.length > 0 && (
          <View style={styles.ongoingBanner}>
            <MaterialCommunityIcons name="information-outline" size={18} color={colors.info} />
            <Text style={styles.ongoingText}>
              Current month in progress. Drafts will assume remaining days as paid until month concludes.
            </Text>
          </View>
        )}

        {/* Totals KPI Summary */}
        {rows.length > 0 && totals && (
          <Card style={styles.summaryCard} elevation="md">
            <View style={styles.summaryHeader}>
              <View>
                <Text style={styles.summaryLabel}>Total Net Payable</Text>
                <Text style={styles.summaryTotalVal}>
                  {formatCurrency(totals.netSalary || 0)}
                </Text>
              </View>
              <Badge
                label={`${rows.length} Staff`}
                variant="primary"
                size="md"
              />
            </View>

            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryItemLabel}>Earned Gross</Text>
                <Text style={styles.summaryItemVal}>{formatCurrency(totals.earnedGross || 0)}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryItemLabel}>Deductions (PF/ESI)</Text>
                <Text style={[styles.summaryItemVal, { color: colors.danger }]}>
                  {formatCurrency(totals.deductions || 0)}
                </Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryItemLabel}>Employer Contrib.</Text>
                <Text style={styles.summaryItemVal}>
                  {formatCurrency(totals.employerContribution || 0)}
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* Search Bar & List Header */}
        {rows.length > 0 && (
          <View style={styles.searchContainer}>
            <Input
              placeholder="Search by staff name or code..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              leftIcon="magnify"
              containerStyle={styles.searchInput}
            />
          </View>
        )}

        {/* Payroll Rows */}
        {loading ? (
          <Loader message="Loading payroll records..." />
        ) : rows.length === 0 ? (
          <Card style={styles.emptyCard}>
            <MaterialCommunityIcons name="cash-multiple" size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No Payroll Data for {formatMonth(month)}</Text>
            <Text style={styles.emptySubtitle}>
              Tap "Generate Payroll" above to compute salary slips based on attendance records and salary structures.
            </Text>
            <Button
              title="Generate Now"
              onPress={handleGenerate}
              loading={actionLoading}
              icon="lightning-bolt"
              style={styles.emptyBtn}
            />
          </Card>
        ) : filteredRows.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No matching staff found</Text>
            <Text style={styles.emptySubtitle}>Try adjusting your search query.</Text>
          </Card>
        ) : (
          <View style={styles.list}>
            {filteredRows.map((row) => {
              const isDraft = row.status === 'DRAFT';
              return (
                <Card key={row._id} style={styles.staffCard} elevation="sm">
                  <View style={styles.staffHeader}>
                    <View style={styles.staffInfo}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                          {initials(row.staff?.name || 'ST')}
                        </Text>
                      </View>
                      <View>
                        <Text style={styles.staffName}>{row.staff?.name || 'Staff Member'}</Text>
                        <Text style={styles.staffCode}>
                          ID: {row.staff?.employeeCode || 'N/A'}
                        </Text>
                      </View>
                    </View>
                    <Badge
                      label={row.status || 'DRAFT'}
                      variant={isDraft ? 'warning' : 'success'}
                      size="sm"
                    />
                  </View>

                  <View style={styles.salaryRow}>
                    <View>
                      <Text style={styles.salaryLabel}>Net Take-Home</Text>
                      <Text style={styles.salaryNet}>{formatCurrency(row.netSalary)}</Text>
                    </View>
                    <View style={styles.salaryMetaRight}>
                      <Text style={styles.grossText}>
                        Gross: {formatCurrency(row.earnings?.gross || 0)}
                      </Text>
                      <Text style={styles.deductText}>
                        Deductions: -{formatCurrency(row.deductions?.total || 0)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardFooter}>
                    <View style={styles.daysBadge}>
                      <MaterialCommunityIcons name="calendar-check" size={14} color={colors.textSecondary} />
                      <Text style={styles.daysText}>
                        {row.payableDays ?? row.attendance?.payableDays ?? 0} Paid Days
                        {(row.lopDays ?? row.attendance?.lopDays) > 0 &&
                          ` (${row.lopDays ?? row.attendance?.lopDays} LOP)`}
                      </Text>
                    </View>
                    <Button
                      title="Inspect / Edit"
                      variant="outline"
                      size="sm"
                      onPress={() => openSlipModal(row)}
                    />
                  </View>
                </Card>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Slip Breakdown & Adjustments Modal */}
      <Modal
        visible={!!selectedSlip}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedSlip(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {selectedSlip?.staff?.name || 'Staff Member'}
                </Text>
                <Text style={styles.modalSub}>
                  {formatMonth(selectedSlip?.period)} • ID: {selectedSlip?.staff?.employeeCode || 'N/A'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedSlip(null)}
                style={styles.closeBtn}
              >
                <MaterialCommunityIcons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll}>
              {/* Status Banner */}
              <View style={styles.modalStatusRow}>
                <Badge
                  label={selectedSlip?.status || 'DRAFT'}
                  variant={selectedSlip?.status === 'FINAL' ? 'success' : 'warning'}
                  size="md"
                />
                <Text style={styles.netHighlight}>
                  {formatCurrency(selectedSlip?.netSalary || 0)}
                </Text>
              </View>

              {/* Attendance Details */}
              <Text style={styles.sectionHeading}>Attendance Days</Text>
              <View style={styles.breakdownBox}>
                <RowItem label="Present Days" value={String(selectedSlip?.attendance?.present ?? 0)} />
                <RowItem label="Paid Leaves" value={String(selectedSlip?.attendance?.leave ?? 0)} />
                <RowItem label="Loss of Pay (LOP)" value={String(selectedSlip?.lopDays ?? 0)} isNegative />
                <RowItem
                  label="Net Payable Days"
                  value={String(selectedSlip?.payableDays ?? 0)}
                  isBold
                />
              </View>

              {/* Earnings Breakdown */}
              <Text style={styles.sectionHeading}>Earnings Breakdown</Text>
              <View style={styles.breakdownBox}>
                <RowItem label="Basic Salary" value={formatCurrency(selectedSlip?.earnings?.basic ?? 0)} />
                <RowItem label="HRA" value={formatCurrency(selectedSlip?.earnings?.hra ?? 0)} />
                <RowItem label="Special Allowance" value={formatCurrency(selectedSlip?.earnings?.special ?? 0)} />
                <RowItem label="Other Allowances" value={formatCurrency(selectedSlip?.earnings?.other ?? 0)} />
                <RowItem
                  label="Total Gross Earnings"
                  value={formatCurrency(selectedSlip?.earnings?.gross ?? 0)}
                  isBold
                />
              </View>

              {/* Deductions Breakdown */}
              <Text style={styles.sectionHeading}>Deductions</Text>
              <View style={styles.breakdownBox}>
                <RowItem label="Employee PF (12%)" value={formatCurrency(selectedSlip?.deductions?.pf ?? 0)} isNegative />
                <RowItem label="Employee ESI (0.75%)" value={formatCurrency(selectedSlip?.deductions?.esi ?? 0)} isNegative />
                <RowItem
                  label="Other Deductions (Advance/Fine)"
                  value={formatCurrency(selectedSlip?.deductions?.other ?? 0)}
                  isNegative
                />
                <RowItem
                  label="Total Deductions"
                  value={formatCurrency(selectedSlip?.deductions?.total ?? 0)}
                  isNegative
                  isBold
                />
              </View>

              {/* Employer Contributions */}
              <Text style={styles.sectionHeading}>Employer Statutory Contributions</Text>
              <View style={styles.breakdownBox}>
                <RowItem label="Employer PF (13%)" value={formatCurrency(selectedSlip?.employerContribution?.pf ?? 0)} />
                <RowItem label="Employer ESI (3.25%)" value={formatCurrency(selectedSlip?.employerContribution?.esi ?? 0)} />
                <RowItem
                  label="Total Employer Contrib."
                  value={formatCurrency(selectedSlip?.employerContribution?.total ?? 0)}
                  isBold
                />
              </View>

              {/* Banking & Statutory Info */}
              <Text style={styles.sectionHeading}>Banking & Statutory Details</Text>
              <View style={styles.breakdownBox}>
                <RowItem label="Bank Name" value={selectedSlip?.staff?.bankName || 'N/A'} />
                <RowItem label="Account No" value={selectedSlip?.staff?.accountNo || 'N/A'} />
                <RowItem label="IFSC Code" value={selectedSlip?.staff?.ifsc || 'N/A'} />
                <RowItem label="UAN (PF)" value={selectedSlip?.staff?.uan || 'N/A'} />
                <RowItem label="ESIC No" value={selectedSlip?.staff?.esicNo || 'N/A'} />
              </View>

              {/* Admin Adjustments Section (Editable if DRAFT) */}
              {selectedSlip?.status === 'DRAFT' ? (
                <View style={styles.editSection}>
                  <Text style={styles.sectionHeading}>Adjust Draft Deductions & Remarks</Text>
                  <Input
                    label="Other Deductions (₹)"
                    value={editOtherDeductions}
                    onChangeText={setEditOtherDeductions}
                    keyboardType="numeric"
                    placeholder="e.g. 500"
                    helperText="Advance repayments, meal charges, or adjustments"
                  />
                  <Input
                    label="Admin Remarks"
                    value={editRemarks}
                    onChangeText={setEditRemarks}
                    placeholder="e.g. Adjusted advance recovery for this month"
                    multiline
                  />
                  <Button
                    title="Save Adjustments"
                    onPress={handleSaveSlipAdjustments}
                    loading={updatingSlip}
                    icon="content-save"
                    style={styles.saveSlipBtn}
                  />
                </View>
              ) : selectedSlip?.remarks ? (
                <View style={styles.breakdownBox}>
                  <Text style={styles.remarksLabel}>Remarks:</Text>
                  <Text style={styles.remarksText}>{selectedSlip.remarks}</Text>
                </View>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

function RowItem({ label, value, isNegative, isBold }) {
  return (
    <View style={styles.rowItem}>
      <Text style={[styles.rowLabel, isBold && styles.boldText]}>{label}</Text>
      <Text
        style={[
          styles.rowValue,
          isNegative && styles.negativeText,
          isBold && styles.boldText,
        ]}
      >
        {isNegative && value !== '₹0' && value !== '-' ? `-${value}` : value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  alertWrapper: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  monthCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  monthNavBtn: {
    padding: 4,
  },
  monthNavDisabled: {
    opacity: 0.3,
  },
  monthDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  monthLabel: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionBtn: {
    flex: 1,
  },
  ongoingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.infoBg,
    borderRadius: borderRadius.md,
    padding: 12,
    gap: 8,
    marginBottom: 16,
  },
  ongoingText: {
    flex: 1,
    fontSize: typography.sizes.xs,
    color: colors.info,
    lineHeight: 18,
  },
  summaryCard: {
    padding: 16,
    marginBottom: 16,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  summaryLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  summaryTotalVal: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  summaryGrid: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  summaryItemLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginBottom: 2,
    textAlign: 'center',
  },
  summaryItemVal: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    textAlign: 'center',
  },
  searchContainer: {
    marginBottom: 12,
  },
  searchInput: {
    marginBottom: 0,
  },
  list: {
    gap: 12,
  },
  staffCard: {
    padding: 16,
  },
  staffHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  staffInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  staffName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  staffCode: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
  },
  salaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    backgroundColor: colors.bgApp,
    padding: 12,
    borderRadius: borderRadius.md,
    marginBottom: 12,
  },
  salaryLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  salaryNet: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  salaryMetaRight: {
    alignItems: 'flex-end',
  },
  grossText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
  deductText: {
    fontSize: typography.sizes.xs,
    color: colors.danger,
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  daysBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  daysText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
  emptyCard: {
    alignItems: 'center',
    padding: 32,
    marginVertical: 20,
  },
  emptyTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginTop: 12,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  emptyBtn: {
    marginTop: 8,
    minWidth: 160,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.backdrop,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '90%',
    paddingBottom: 24,
    ...shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  modalSub: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  modalScroll: {
    padding: 20,
  },
  modalStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.bgApp,
    padding: 12,
    borderRadius: borderRadius.md,
    marginBottom: 16,
  },
  netHighlight: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  sectionHeading: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginTop: 12,
    marginBottom: 8,
  },
  breakdownBox: {
    backgroundColor: colors.bgApp,
    borderRadius: borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  rowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  rowLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
  rowValue: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  negativeText: {
    color: colors.danger,
  },
  boldText: {
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  editSection: {
    marginTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  saveSlipBtn: {
    marginTop: 12,
  },
  remarksLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.textMuted,
    marginBottom: 4,
  },
  remarksText: {
    fontSize: typography.sizes.xs,
    color: colors.text,
    fontStyle: 'italic',
  },
});
