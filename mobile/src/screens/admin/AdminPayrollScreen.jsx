import { useCallback, useEffect, useMemo, useState } from 'react';
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
  const [activeStep, setActiveStep] = useState(1); // 1: Calculate, 2: Verify, 3: Process, 4: Complete
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

  // Slip Inspector & Edit Modal State
  const [selectedSlip, setSelectedSlip] = useState(null);
  const [editOtherDeductions, setEditOtherDeductions] = useState('0');
  const [editRemarks, setEditRemarks] = useState('');
  const [updatingSlip, setUpdatingSlip] = useState(false);
  const [viewHistoryModal, setViewHistoryModal] = useState(false);

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
      if (res?.data?.monthCompleted && !res?.data?.hasDraft) {
        setActiveStep(4);
      } else if (res?.data?.hasDraft) {
        setActiveStep(2);
      } else {
        setActiveStep(1);
      }
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
    try {
      const res = await generatePayrollApi(month);
      setData(res?.data || data);
      setActiveStep(3);
      setFeedback({
        type: 'success',
        text: `Payroll generated and processed for ${formatMonth(month)}.`,
      });
      fetchPayroll(month);
      setTimeout(() => setFeedback({ type: 'success', text: '' }), 4000);
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err.message || 'Failed to process payroll.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleFinalize = () => {
    NativeAlert.alert(
      `Finalize Payroll for ${formatMonth(month)}?`,
      'Once finalized, salary slips will be published to staff profiles.',
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
              setActiveStep(4);
              setFeedback({
                type: 'success',
                text: `Payroll for ${formatMonth(month)} has been finalized! Slips published.`,
              });
              fetchPayroll(month);
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

  const rows = data.rows || [];
  const totals = data.totals || {};
  const totalEmployeesCount = rows.length;
  const grossAmount = totals.earnedGross ?? totals.gross ?? 0;
  const deductionsAmount = totals.deductions ?? 0;
  const netAmount = totals.netSalary ?? totals.net ?? 0;

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
      NativeAlert.alert('Success', 'Salary slip updated successfully.');
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
    return [1, 2, 3].map((offset) => {
      const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      return {
        key: mStr,
        monthLabel: formatMonth(mStr),
        dateLabel: `${lastDay} ${d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}`,
      };
    });
  }, []);

  const steps = [
    { num: 1, label: 'Calculate' },
    { num: 2, label: 'Verify' },
    { num: 3, label: 'Process' },
    { num: 4, label: 'Complete' },
  ];

  return (
    <ScreenWrapper contentContainerStyle={styles.container} scrollable>
      {/* Header matching Screen 4: "< Payroll Processing" */}
      <Header
        title="Payroll Processing"
        onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
      />

      {/* Month Navigator */}
      <Card style={styles.monthNavCard} elevation="xs">
        <TouchableOpacity
          onPress={handlePrevMonth}
          style={styles.navBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialCommunityIcons name="chevron-left" size={26} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.monthCenter}>
          <Text style={styles.monthText}>{formatMonth(month)}</Text>
          <Text style={styles.monthSub}>
            {data.monthCompleted ? 'Period Closed' : 'Current Active Period'}
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleNextMonth}
          style={styles.navBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialCommunityIcons name="chevron-right" size={26} color={colors.text} />
        </TouchableOpacity>
      </Card>

      {feedback.text ? (
        <Alert
          type={feedback.type}
          message={feedback.text}
          onDismiss={() => setFeedback({ type: 'success', text: '' })}
        />
      ) : null}

      {/* 4-Step Stepper matching Screen 4 */}
      <View style={styles.stepperContainer}>
        {steps.map((step, idx) => {
          const isActive = step.num <= activeStep;
          const isCurrent = step.num === activeStep;
          return (
            <View key={step.num} style={styles.stepItemWrap}>
              <View style={styles.stepNodeRow}>
                <View
                  style={[
                    styles.stepCircle,
                    isActive ? styles.stepCircleActive : styles.stepCircleInactive,
                  ]}
                >
                  <Text
                    style={[
                      styles.stepNumText,
                      isActive ? styles.stepNumActive : styles.stepNumInactive,
                    ]}
                  >
                    {step.num}
                  </Text>
                </View>
                {idx < steps.length - 1 && (
                  <View
                    style={[
                      styles.stepLine,
                      step.num < activeStep && styles.stepLineActive,
                    ]}
                  />
                )}
              </View>
              <Text
                style={[
                  styles.stepLabel,
                  isCurrent && styles.stepLabelCurrent,
                ]}
              >
                {step.label}
              </Text>
            </View>
          );
        })}
      </View>

      {/* 2x2 Metric Cards matching Screen 4 */}
      <View style={styles.metricGrid}>
        <TouchableOpacity
          style={styles.metricCard}
          onPress={() => setViewHistoryModal(true)}
          activeOpacity={0.8}
        >
          <View style={styles.metricCardTop}>
            <Text style={styles.metricLabel}>Total Employees</Text>
            <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textSecondary} />
          </View>
          <Text style={styles.metricValue}>{totalEmployeesCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.metricCard}
          onPress={() => setViewHistoryModal(true)}
          activeOpacity={0.8}
        >
          <View style={styles.metricCardTop}>
            <Text style={styles.metricLabel}>Gross Salary</Text>
            <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textSecondary} />
          </View>
          <Text style={styles.metricValue}>{formatCurrency(grossAmount)}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.metricGrid}>
        <TouchableOpacity
          style={styles.metricCard}
          onPress={() => setViewHistoryModal(true)}
          activeOpacity={0.8}
        >
          <View style={styles.metricCardTop}>
            <Text style={styles.metricLabel}>Deductions</Text>
            <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textSecondary} />
          </View>
          <Text style={styles.metricValue}>{formatCurrency(deductionsAmount)}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.metricCard}
          onPress={() => setViewHistoryModal(true)}
          activeOpacity={0.8}
        >
          <View style={styles.metricCardTop}>
            <Text style={styles.metricLabel}>Net Payroll</Text>
            <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textSecondary} />
          </View>
          <Text style={styles.metricValue}>{formatCurrency(netAmount)}</Text>
        </TouchableOpacity>
      </View>

      {/* Process Payroll Main Button */}
      <TouchableOpacity
        style={styles.processBtn}
        onPress={activeStep === 3 ? handleFinalize : handleProcessPayroll}
        disabled={actionLoading}
        activeOpacity={0.85}
      >
        <Text style={styles.processBtnText}>
          {actionLoading
            ? 'Processing...'
            : activeStep === 3
            ? 'Finalize & Publish Slips'
            : 'Process Payroll'}
        </Text>
      </TouchableOpacity>

      {/* Recent Payroll History Section */}
      <View style={styles.historySection}>
        <Text style={styles.historySectionTitle}>Recent Payroll History</Text>

        {recentHistory.map((item) => (
          <TouchableOpacity
            key={item.key}
            style={styles.historyCard}
            onPress={() => {
              setMonth(item.key);
              setViewHistoryModal(true);
            }}
            activeOpacity={0.8}
          >
            <View style={styles.historyInfo}>
              <Text style={styles.historyMonth}>{item.monthLabel}</Text>
              <Text style={styles.historyDate}>{item.dateLabel}</Text>
            </View>
            <View style={styles.historyRight}>
              <View style={styles.completedBadge}>
                <Text style={styles.completedBadgeText}>History</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Breakdown / Employee Slips Modal */}
      <Modal
        visible={viewHistoryModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setViewHistoryModal(false)}
      >
        <ScreenWrapper contentContainerStyle={styles.container} scrollable>
          <Header
            title={`${formatMonth(month)} Slips`}
            onBack={() => setViewHistoryModal(false)}
          />

          {rows.length === 0 ? (
            <Card style={styles.emptyCard}>
              <MaterialCommunityIcons name="file-document-outline" size={48} color={colors.textSecondary} />
              <Text style={styles.emptyTitle}>No slips recorded</Text>
              <Text style={styles.emptySub}>Tap "Process Payroll" to compute slips for this month.</Text>
            </Card>
          ) : (
            <View style={styles.slipsList}>
              {rows.map((slip) => (
                <TouchableOpacity
                  key={slip._id}
                  onPress={() => openSlipDetails(slip)}
                  activeOpacity={0.8}
                >
                  <Card style={styles.slipCard} elevation="xs">
                    <View style={styles.slipHeader}>
                      <View>
                        <Text style={styles.slipStaffName}>{slip.staff?.name}</Text>
                        <Text style={styles.slipStaffCode}>{slip.staff?.employeeCode}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Badge
                          label={slip.status === 'final' ? 'Final' : 'Draft'}
                          variant={slip.status === 'final' ? 'success' : 'warning'}
                          size="sm"
                        />
                        <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textSecondary} />
                      </View>
                    </View>
                    <View style={styles.slipAmountRow}>
                      <Text style={styles.slipAmountLabel}>Net Pay:</Text>
                      <Text style={styles.slipAmountVal}>{formatCurrency(slip.netSalary)}</Text>
                    </View>
                  </Card>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScreenWrapper>
      </Modal>

      {/* Individual Slip Inspector & Edit Modal */}
      <Modal
        visible={Boolean(selectedSlip)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedSlip(null)}
      >
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCard} elevation="lg">
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{selectedSlip?.staff?.name || 'Salary Slip'}</Text>
                <Text style={styles.modalSub}>{selectedSlip?.staff?.employeeCode || 'Employee'} • {formatMonth(month)}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedSlip(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <MaterialCommunityIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Earnings Breakdown */}
              <Text style={styles.modalSectionTitle}>Earnings Breakdown</Text>
              <View style={styles.breakdownBox}>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Basic Salary</Text>
                  <Text style={styles.breakdownVal}>{formatCurrency(selectedSlip?.earnings?.basic || 0)}</Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>HRA</Text>
                  <Text style={styles.breakdownVal}>{formatCurrency(selectedSlip?.earnings?.hra || 0)}</Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Special Allowance</Text>
                  <Text style={styles.breakdownVal}>{formatCurrency(selectedSlip?.earnings?.special || 0)}</Text>
                </View>
                <View style={[styles.breakdownRow, styles.breakdownRowTotal]}>
                  <Text style={styles.breakdownLabelBold}>Earned Gross</Text>
                  <Text style={styles.breakdownValBold}>{formatCurrency(selectedSlip?.earnings?.gross || 0)}</Text>
                </View>
              </View>

              {/* Deductions Breakdown */}
              <Text style={styles.modalSectionTitle}>Statutory & Other Deductions</Text>
              <View style={styles.breakdownBox}>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Provident Fund (PF)</Text>
                  <Text style={styles.breakdownVal}>{formatCurrency(selectedSlip?.deductions?.pf || 0)}</Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>ESI</Text>
                  <Text style={styles.breakdownVal}>{formatCurrency(selectedSlip?.deductions?.esi || 0)}</Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Other Deductions</Text>
                  <Text style={styles.breakdownVal}>{formatCurrency(selectedSlip?.deductions?.other || 0)}</Text>
                </View>
                <View style={[styles.breakdownRow, styles.breakdownRowTotal]}>
                  <Text style={styles.breakdownLabelBold}>Total Deductions</Text>
                  <Text style={[styles.breakdownValBold, { color: colors.danger }]}>
                    -{formatCurrency(selectedSlip?.deductions?.total || 0)}
                  </Text>
                </View>
              </View>

              {/* Net Payable Highlight */}
              <View style={styles.netHighlightBox}>
                <Text style={styles.netHighlightLabel}>Net Take-Home Pay</Text>
                <Text style={styles.netHighlightVal}>{formatCurrency(selectedSlip?.netSalary || 0)}</Text>
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
                    helper="Advance, unpaid fines, or loan deductions"
                  />
                  <Input
                    label="Admin Remarks"
                    value={editRemarks}
                    onChangeText={setEditRemarks}
                    placeholder="e.g. Adjusted advance payment"
                  />
                  <Button
                    title={updatingSlip ? 'Saving Slip...' : 'Update Slip'}
                    onPress={handleUpdateSlip}
                    disabled={updatingSlip}
                    style={{ marginTop: 8 }}
                  />
                </View>
              ) : (
                <View style={styles.finalizedNote}>
                  <MaterialCommunityIcons name="check-decagram" size={20} color={colors.success} />
                  <Text style={styles.finalizedNoteText}>
                    This payroll has been finalized. Slips are published and locked.
                  </Text>
                </View>
              )}

              <Button
                title="Close"
                variant="outline"
                onPress={() => setSelectedSlip(null)}
                style={{ marginTop: 12, marginBottom: 10 }}
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
  stepperContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 18,
    paddingHorizontal: 8,
  },
  stepItemWrap: {
    alignItems: 'center',
    flex: 1,
  },
  stepNodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center',
    position: 'relative',
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  stepCircleActive: {
    backgroundColor: colors.primary,
  },
  stepCircleInactive: {
    backgroundColor: '#E2E8F0',
  },
  stepNumText: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
  },
  stepNumActive: {
    color: '#FFFFFF',
  },
  stepNumInactive: {
    color: colors.textSecondary,
  },
  stepLine: {
    position: 'absolute',
    left: '50%',
    width: '100%',
    height: 2,
    backgroundColor: '#E2E8F0',
    zIndex: 1,
  },
  stepLineActive: {
    backgroundColor: colors.primary,
  },
  stepLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 6,
    textAlign: 'center',
  },
  stepLabelCurrent: {
    color: colors.primary,
    fontWeight: typography.weights.bold,
  },

  // 2x2 Metric Grid
  metricGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
  },
  metricCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
  },

  // Process Payroll Button
  processBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 24,
    ...shadows.sm,
  },
  processBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: typography.weights.bold,
  },

  // History Section
  historySection: {
    gap: 12,
  },
  historySectionTitle: {
    fontSize: 15,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
    marginBottom: 4,
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyInfo: {
    gap: 3,
  },
  historyMonth: {
    fontSize: 15,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
  },
  historyDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  historyRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  completedBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: borderRadius.pill,
  },
  completedBadgeText: {
    color: '#16A34A',
    fontSize: 12,
    fontWeight: typography.weights.semibold,
  },

  // Modal Slips list
  slipsList: {
    gap: 10,
    marginTop: 10,
  },
  slipCard: {
    padding: 16,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  slipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  slipStaffName: {
    fontSize: 15,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
  },
  slipStaffCode: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  slipAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  slipAmountLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  slipAmountVal: {
    fontSize: 14,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  emptyCard: {
    padding: 36,
    alignItems: 'center',
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },

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
  monthSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  navBtn: {
    padding: 6,
    borderRadius: borderRadius.md,
    backgroundColor: '#F8FAFC',
  },

  // Modal Inspector Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    padding: 20,
    borderRadius: borderRadius.xl,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
  },
  modalSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  modalSectionTitle: {
    fontSize: 13,
    fontWeight: typography.weights.bold,
    color: '#334155',
    marginTop: 12,
    marginBottom: 8,
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
    fontSize: 13,
    color: colors.textSecondary,
  },
  breakdownVal: {
    fontSize: 13,
    fontWeight: typography.weights.medium,
    color: '#0F172A',
  },
  breakdownLabelBold: {
    fontSize: 13,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
  },
  breakdownValBold: {
    fontSize: 14,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
  },
  netHighlightBox: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    borderRadius: borderRadius.lg,
    padding: 14,
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  netHighlightLabel: {
    fontSize: 14,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
  },
  netHighlightVal: {
    fontSize: 20,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  editSection: {
    marginTop: 14,
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
