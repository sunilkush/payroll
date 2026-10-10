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

  const rows = data.rows || [];
  const totals = data.totals || {};
  const totalEmployeesCount = rows.length;
  const grossAmount = totals.gross || 0;
  const deductionsAmount = totals.deductions || 0;
  const netAmount = totals.net || 0;

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
                <Card key={slip._id} style={styles.slipCard} elevation="xs">
                  <View style={styles.slipHeader}>
                    <View>
                      <Text style={styles.slipStaffName}>{slip.staff?.name}</Text>
                      <Text style={styles.slipStaffCode}>{slip.staff?.employeeCode}</Text>
                    </View>
                    <Badge
                      label={slip.status || 'Draft'}
                      variant={slip.status === 'final' ? 'success' : 'warning'}
                      size="sm"
                    />
                  </View>
                  <View style={styles.slipAmountRow}>
                    <Text style={styles.slipAmountLabel}>Net Pay:</Text>
                    <Text style={styles.slipAmountVal}>{formatCurrency(slip.netSalary)}</Text>
                  </View>
                </Card>
              ))}
            </View>
          )}
        </ScreenWrapper>
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
    fontSize: 11,
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
    fontSize: 11,
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
    fontSize: 14,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
  },
  slipStaffCode: {
    fontSize: 11,
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
});
