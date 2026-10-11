import { useEffect, useState, useMemo } from 'react';
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
import Card from '../../components/common/Card.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import Header from '../../components/common/Header.jsx';
import Loader from '../../components/common/Loader.jsx';
import ScreenWrapper from '../../components/common/ScreenWrapper.jsx';
import { borderRadius, colors, radius, shadows, spacing, typography } from '../../theme/index.js';
import { formatCurrency, formatMonth } from '../../utils/format.js';

export default function StaffSalaryScreen({ navigation }) {
  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [filterTab, setFilterTab] = useState('All'); // 'All' | 'Paid' | 'Pending'
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

  const filteredPayrolls = useMemo(() => {
    if (filterTab === 'All') return payrolls;
    if (filterTab === 'Paid') {
      return payrolls.filter(
        (p) => (p.status || '').toLowerCase() === 'paid' || (p.status || '').toLowerCase() === 'final'
      );
    }
    if (filterTab === 'Pending') {
      return payrolls.filter(
        (p) => (p.status || '').toLowerCase() !== 'paid' && (p.status || '').toLowerCase() !== 'final'
      );
    }
    return payrolls;
  }, [payrolls, filterTab]);

  return (
    <ScreenWrapper
      contentContainerStyle={styles.container}
      scrollable
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Header
        title="My Payslips"
        onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
      />

      {error ? <Alert type="error">{error}</Alert> : null}

      {/* Filter Tabs matching Screen 6 */}
      <View style={styles.tabsRow}>
        {['All', 'Paid', 'Pending'].map((tab) => {
          const isActive = filterTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tabButton, isActive && styles.tabButtonActive]}
              onPress={() => setFilterTab(tab)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <Loader message="Loading salary records..." />
      ) : filteredPayrolls.length === 0 ? (
        <EmptyState
          icon="file-document-outline"
          title="No salary slips found"
          description={`There are no payslips under the ${filterTab.toLowerCase()} category.`}
        />
      ) : (
        <View style={styles.list}>
          {filteredPayrolls.map((payroll) => {
            const isPaid = (payroll.status || 'paid').toLowerCase() === 'paid' || (payroll.status || '').toLowerCase() === 'final';
            return (
              <TouchableOpacity
                key={payroll._id}
                onPress={() => setSelectedSlip(payroll)}
                activeOpacity={0.85}
              >
                <Card style={styles.slipCard} elevation="xs">
                  <View style={styles.slipCardInner}>
                    <View style={styles.slipInfo}>
                      <Text style={styles.slipMonth}>{formatMonth(payroll.period)}</Text>
                      <Text style={styles.slipSubLabel}>Monthly Salary</Text>
                      <Text style={styles.slipAmount}>
                        {formatCurrency(payroll.netSalary || payroll.earnings?.gross || 0)}
                      </Text>
                    </View>

                    <View style={styles.slipBadgeWrap}>
                      <Badge
                        status={isPaid ? 'Paid' : 'Pending'}
                        variant={isPaid ? 'success' : 'warning'}
                      />
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Screen 7: Payslip Details Modal */}
      <Modal
        visible={Boolean(selectedSlip)}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setSelectedSlip(null)}
      >
        <ScreenWrapper contentContainerStyle={styles.detailContainer} scrollable>
          {/* Detail Header with back button */}
          <Header
            title="Payslip Details"
            onBack={() => setSelectedSlip(null)}
          />

          {selectedSlip && (
            <View style={styles.detailContent}>
              {/* Month + Status + Date */}
              <View style={styles.detailTitleRow}>
                <View style={styles.monthBadgeRow}>
                  <Text style={styles.detailMonth}>
                    {formatMonth(selectedSlip.period)}
                  </Text>
                  <View style={styles.paidPill}>
                    <Text style={styles.paidPillText}>
                      {selectedSlip.status ? (selectedSlip.status.charAt(0).toUpperCase() + selectedSlip.status.slice(1)) : 'Paid'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.paymentDate}>
                  Payment Date: {selectedSlip.paymentDate || selectedSlip.updatedAt ? new Date(selectedSlip.paymentDate || selectedSlip.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Pending'}
                </Text>
              </View>

              {/* Net Salary Royal Blue Banner */}
              <View style={styles.netSalaryBanner}>
                <Text style={styles.netSalaryLabel}>Net Salary</Text>
                <Text style={styles.netSalaryValue}>
                  {formatCurrency(selectedSlip.netSalary || 0)}
                </Text>
              </View>

              {/* Earnings Card */}
              <Card style={styles.breakdownCard} elevation="xs">
                <Text style={styles.breakdownCardTitle}>Earnings</Text>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Basic Salary</Text>
                  <Text style={styles.breakdownValue}>
                    {formatCurrency(selectedSlip.earnings?.basic || 0)}
                  </Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>HRA</Text>
                  <Text style={styles.breakdownValue}>
                    {formatCurrency(selectedSlip.earnings?.hra || 0)}
                  </Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Special Allowance</Text>
                  <Text style={styles.breakdownValue}>
                    {formatCurrency(selectedSlip.earnings?.special || 0)}
                  </Text>
                </View>
                {selectedSlip.earnings?.other > 0 && (
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Other Allowance</Text>
                    <Text style={styles.breakdownValue}>
                      {formatCurrency(selectedSlip.earnings?.other)}
                    </Text>
                  </View>
                )}
                <View style={styles.dividerLine} />
                <View style={styles.breakdownTotalRow}>
                  <Text style={styles.breakdownTotalLabel}>Total Earnings</Text>
                  <Text style={styles.breakdownTotalValue}>
                    {formatCurrency(selectedSlip.earnings?.gross || 0)}
                  </Text>
                </View>
              </Card>

              {/* Deductions Card */}
              <Card style={styles.breakdownCard} elevation="xs">
                <Text style={styles.breakdownCardTitle}>Deductions</Text>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>PF</Text>
                  <Text style={styles.breakdownValue}>
                    {formatCurrency(selectedSlip.deductions?.pf || 0)}
                  </Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>ESI</Text>
                  <Text style={styles.breakdownValue}>
                    {formatCurrency(selectedSlip.deductions?.esi || 0)}
                  </Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Professional Tax</Text>
                  <Text style={styles.breakdownValue}>
                    {formatCurrency(selectedSlip.deductions?.pt || selectedSlip.deductions?.other || 0)}
                  </Text>
                </View>
                <View style={styles.dividerLine} />
                <View style={styles.breakdownTotalRow}>
                  <Text style={styles.breakdownTotalLabel}>Total Deductions</Text>
                  <Text style={styles.breakdownTotalValue}>
                    {formatCurrency(selectedSlip.deductions?.total || 0)}
                  </Text>
                </View>
              </Card>

              {/* Bottom Solid Blue Bar */}
              <View style={styles.bottomNetBar}>
                <Text style={styles.bottomNetBarLabel}>Net Salary</Text>
                <Text style={styles.bottomNetBarValue}>
                  {formatCurrency(selectedSlip.netSalary || 0)}
                </Text>
              </View>
            </View>
          )}
        </ScreenWrapper>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 36,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: typography.weights.bold,
  },
  list: {
    gap: 12,
  },
  slipCard: {
    padding: 16,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  slipCardInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  slipInfo: {
    flex: 1,
  },
  slipMonth: {
    fontSize: 17,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  slipSubLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: 6,
  },
  slipAmount: {
    fontSize: 20,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  slipBadgeWrap: {
    alignItems: 'flex-end',
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: borderRadius.pill,
  },
  paidPill: {
    backgroundColor: '#DCFCE7',
  },
  paidPillText: {
    color: '#16A34A',
    fontSize: 12,
    fontWeight: typography.weights.semibold,
  },
  pendingPill: {
    backgroundColor: '#FEF3C7',
  },
  pendingPillText: {
    color: '#D97706',
    fontSize: 12,
    fontWeight: typography.weights.semibold,
  },
  emptyCard: {
    padding: 36,
    alignItems: 'center',
    borderRadius: borderRadius.lg,
  },
  emptyTitle: {
    fontSize: typography.sizes.md,
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

  // Details Modal Screen styles
  detailContainer: {
    paddingBottom: 40,
  },
  detailContent: {
    gap: 16,
    marginTop: 8,
  },
  detailTitleRow: {
    marginBottom: 4,
  },
  monthBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  detailMonth: {
    fontSize: 22,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  paymentDate: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  netSalaryBanner: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    padding: 20,
    justifyContent: 'center',
    ...shadows.sm,
  },
  netSalaryLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: typography.weights.medium,
  },
  netSalaryValue: {
    fontSize: 30,
    fontWeight: typography.weights.bold,
    color: colors.white,
    marginTop: 4,
  },
  breakdownCard: {
    padding: 18,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  breakdownCardTitle: {
    fontSize: 16,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7,
  },
  breakdownLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  dividerLine: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 10,
  },
  breakdownTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  breakdownTotalLabel: {
    fontSize: 14,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  breakdownTotalValue: {
    fontSize: 15,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  bottomNetBar: {
    backgroundColor: colors.primary,
    borderRadius: radius.card,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginTop: 12,
    ...shadows.sm,
  },
  bottomNetBarLabel: {
    fontSize: 16,
    fontWeight: typography.weights.bold,
    color: colors.white,
  },
  bottomNetBarValue: {
    fontSize: 20,
    fontWeight: typography.weights.bold,
    color: colors.white,
  },
});
