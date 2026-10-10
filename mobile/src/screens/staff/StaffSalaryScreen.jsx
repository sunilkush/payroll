import { useEffect, useState } from 'react';
import {
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { listMyPayrollsApi } from '../../api/payrollApi.js';
import Alert from '../../components/common/Alert.jsx';
import Badge from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import Header from '../../components/common/Header.jsx';
import Loader from '../../components/common/Loader.jsx';
import ScreenWrapper from '../../components/common/ScreenWrapper.jsx';
import { borderRadius, colors, shadows, typography } from '../../theme/index.js';
import { formatCurrency, formatMonth } from '../../utils/format.js';

export default function StaffSalaryScreen({ navigation }) {
  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selectedSlip, setSelectedSlip] = useState(null);

  const fetchPayrolls = async () => {
    try {
      setError('');
      const res = await listMyPayrollsApi();
      setPayrolls(res?.data?.rows || []);
    } catch (err) {
      setError(err.message || 'Failed to load salary slips.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPayrolls();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPayrolls();
  };

  return (
    <ScreenWrapper contentContainerStyle={styles.container} scrollable>
      <Header
        title="My Salary Slips"
        onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
      />

      {error ? <Alert type="error">{error}</Alert> : null}

      <Text style={styles.subtitle}>
        Finalized salary slips published by your payroll administrator.
      </Text>

      {loading ? (
        <Loader message="Loading salary records..." />
      ) : payrolls.length === 0 ? (
        <Card style={styles.emptyCard}>
          <MaterialCommunityIcons name="file-document-outline" size={44} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No salary slips yet</Text>
          <Text style={styles.emptySub}>
            Your salary slips will appear here once the month's payroll is finalized.
          </Text>
        </Card>
      ) : (
        <View style={styles.list}>
          {payrolls.map((payroll) => (
            <Card key={payroll._id} style={styles.slipCard} elevation="sm">
              <View style={styles.cardHeader}>
                <View style={styles.monthBadge}>
                  <MaterialCommunityIcons name="calendar" size={18} color={colors.primary} />
                  <Text style={styles.monthText}>{formatMonth(payroll.period)}</Text>
                </View>
                <Badge
                  label={payroll.status || 'Final'}
                  variant="success"
                  size="sm"
                />
              </View>

              <View style={styles.amountRow}>
                <View>
                  <Text style={styles.amountLabel}>Net Take-Home Pay</Text>
                  <Text style={styles.netAmount}>{formatCurrency(payroll.netSalary)}</Text>
                </View>
                <Button
                  title="View Breakdown"
                  size="sm"
                  variant="outline"
                  onPress={() => setSelectedSlip(payroll)}
                />
              </View>

              <View style={styles.metaGrid}>
                <View style={styles.metaCol}>
                  <Text style={styles.metaLabel}>Payable Days</Text>
                  <Text style={styles.metaVal}>
                    {payroll.payableDays}
                    {payroll.lopDays > 0 ? ` (LOP: ${payroll.lopDays})` : ''}
                  </Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.metaCol}>
                  <Text style={styles.metaLabel}>Gross Earnings</Text>
                  <Text style={styles.metaVal}>
                    {formatCurrency(payroll.earnings?.gross || 0)}
                  </Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.metaCol}>
                  <Text style={styles.metaLabel}>Total Deductions</Text>
                  <Text style={[styles.metaVal, { color: colors.danger }]}>
                    -{formatCurrency(payroll.deductions?.total || 0)}
                  </Text>
                </View>
              </View>
            </Card>
          ))}
        </View>
      )}

      {/* Slip Breakdown Modal */}
      <Modal
        visible={Boolean(selectedSlip)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedSlip(null)}
      >
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCard} elevation="lg">
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Salary Breakdown</Text>
                <Text style={styles.modalSub}>
                  {selectedSlip ? formatMonth(selectedSlip.period) : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedSlip(null)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Earnings Breakdown */}
              <Text style={styles.modalSectionTitle}>Earnings</Text>
              <View style={styles.breakdownBox}>
                <BreakdownRow
                  label="Basic Pay"
                  value={formatCurrency(selectedSlip?.earnings?.basic || 0)}
                />
                <BreakdownRow
                  label="HRA"
                  value={formatCurrency(selectedSlip?.earnings?.hra || 0)}
                />
                <BreakdownRow
                  label="Special Allowance"
                  value={formatCurrency(selectedSlip?.earnings?.special || 0)}
                />
                {selectedSlip?.earnings?.other > 0 && (
                  <BreakdownRow
                    label="Other Allowance"
                    value={formatCurrency(selectedSlip?.earnings?.other)}
                  />
                )}
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Gross Earned</Text>
                  <Text style={styles.totalVal}>
                    {formatCurrency(selectedSlip?.earnings?.gross || 0)}
                  </Text>
                </View>
              </View>

              {/* Deductions Breakdown */}
              <Text style={styles.modalSectionTitle}>Deductions</Text>
              <View style={styles.breakdownBox}>
                <BreakdownRow
                  label="EPF (Employee 12%)"
                  value={`-${formatCurrency(selectedSlip?.deductions?.pf || 0)}`}
                  isDeduction
                />
                <BreakdownRow
                  label="ESI (Employee 0.75%)"
                  value={`-${formatCurrency(selectedSlip?.deductions?.esi || 0)}`}
                  isDeduction
                />
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total Deductions</Text>
                  <Text style={[styles.totalVal, { color: colors.danger }]}>
                    -{formatCurrency(selectedSlip?.deductions?.total || 0)}
                  </Text>
                </View>
              </View>

              {/* Net Payable */}
              <View style={styles.netCard}>
                <Text style={styles.netTitle}>Net Disbursed Amount</Text>
                <Text style={styles.netBig}>
                  {formatCurrency(selectedSlip?.netSalary || 0)}
                </Text>
              </View>

              <Button
                title="Close"
                variant="secondary"
                onPress={() => setSelectedSlip(null)}
                style={styles.closeBtn}
              />
            </ScrollView>
          </Card>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

function BreakdownRow({ label, value, isDeduction = false }) {
  return (
    <View style={styles.breakdownRow}>
      <Text style={styles.breakdownLabel}>{label}</Text>
      <Text style={[styles.breakdownValue, isDeduction && { color: colors.danger }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 32,
  },
  subtitle: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  list: {
    gap: 12,
  },
  slipCard: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  monthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  monthText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginLeft: 6,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.primaryBg,
    borderRadius: borderRadius.md,
    padding: 12,
    marginBottom: 12,
  },
  amountLabel: {
    fontSize: 10,
    color: colors.primaryDark,
    fontWeight: typography.weights.medium,
  },
  netAmount: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.primary,
    marginTop: 2,
  },
  metaGrid: {
    flexDirection: 'row',
    backgroundColor: colors.bg,
    borderRadius: borderRadius.md,
    padding: 10,
  },
  metaCol: {
    flex: 1,
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  metaVal: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.text,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    maxHeight: '85%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  modalSub: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  modalSectionTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginTop: 10,
    marginBottom: 6,
  },
  breakdownBox: {
    backgroundColor: colors.bg,
    borderRadius: borderRadius.md,
    padding: 12,
    marginBottom: 8,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  breakdownLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
  breakdownValue: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
    marginTop: 6,
  },
  totalLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  totalVal: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  netCard: {
    backgroundColor: colors.primaryBg,
    borderRadius: borderRadius.md,
    padding: 14,
    alignItems: 'center',
    marginVertical: 14,
  },
  netTitle: {
    fontSize: typography.sizes.xs,
    color: colors.primaryDark,
    fontWeight: typography.weights.semibold,
  },
  netBig: {
    fontSize: 24,
    fontWeight: typography.weights.bold,
    color: colors.primary,
    marginTop: 4,
  },
  closeBtn: {
    marginTop: 4,
    marginBottom: 10,
  },
});
