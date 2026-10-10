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
  applyLeaveApi,
  cancelLeaveApi,
  getLeaveBalanceApi,
  listLeavesApi,
} from '../../api/leaveApi.js';
import Alert from '../../components/common/Alert.jsx';
import Badge from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import Header from '../../components/common/Header.jsx';
import Input from '../../components/common/Input.jsx';
import Loader from '../../components/common/Loader.jsx';
import ScreenWrapper from '../../components/common/ScreenWrapper.jsx';
import { borderRadius, colors, shadows, typography } from '../../theme/index.js';
import { formatDate, todayLocal } from '../../utils/format.js';

export default function StaffLeavesScreen({ navigation }) {
  const [balance, setBalance] = useState(null);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Apply Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [leaveType, setLeaveType] = useState('CL'); // 'CL' | 'EL'
  const [halfDay, setHalfDay] = useState(''); // '' | 'FIRST_HALF' | 'SECOND_HALF'
  const [fromDate, setFromDate] = useState(todayLocal());
  const [toDate, setToDate] = useState(todayLocal());
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const loadData = useCallback(async () => {
    try {
      setActionError('');
      const [balRes, listRes] = await Promise.all([
        getLeaveBalanceApi(),
        listLeavesApi({ page: 1 }),
      ]);
      setBalance(balRes?.data?.balance || null);
      setLeaves(listRes?.data?.items || []);
    } catch (err) {
      setActionError(err.message || 'Failed to load leaves.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleApply = async () => {
    if (!reason.trim()) {
      setFormError('Please provide a reason for the leave.');
      return;
    }

    setSubmitting(true);
    setFormError('');
    try {
      const payload = {
        type: leaveType,
        fromDate,
        toDate: halfDay ? fromDate : toDate,
        halfDay: halfDay || undefined,
        reason: reason.trim(),
      };

      const res = await applyLeaveApi(payload);
      setModalVisible(false);
      setReason('');
      setActionSuccess(
        `Applied for ${res.data?.leave?.days || 1} day(s) of ${leaveType}. Balance is now blocked.`
      );
      loadData();
      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err) {
      setFormError(err.errors?.[0]?.message || err.message || 'Failed to submit leave request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelLeave = (leave) => {
    NativeAlert.alert(
      'Cancel Leave Request',
      `Are you sure you want to cancel your ${leave.type} leave from ${formatDate(
        leave.fromDate
      )}?`,
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Cancel Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelLeaveApi(leave._id);
              setActionSuccess('Leave request cancelled. Balance restored.');
              loadData();
              setTimeout(() => setActionSuccess(''), 3000);
            } catch (err) {
              setActionError(err.message || 'Failed to cancel leave.');
            }
          },
        },
      ]
    );
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case 'APPROVED':
        return 'success';
      case 'REJECTED':
        return 'danger';
      case 'PENDING':
        return 'warning';
      case 'CANCELLED':
      default:
        return 'default';
    }
  };

  if (loading) {
    return <Loader message="Fetching leave balances..." />;
  }

  const [activeTab, setActiveTab] = useState('request'); // 'request' | 'history'

  return (
    <ScreenWrapper contentContainerStyle={styles.container} scrollable>
      <Header
        title="Apply Leave"
        onBack={() => navigation.navigate('Home')}
      />

      {actionSuccess ? <Alert type="success">{actionSuccess}</Alert> : null}
      {actionError ? <Alert type="error">{actionError}</Alert> : null}

      {/* Pill Tabs: Leave Request vs Leave History (Screen 5) */}
      <View style={styles.tabPillRow}>
        <TouchableOpacity
          style={[styles.tabPill, activeTab === 'request' && styles.tabPillActive]}
          onPress={() => setActiveTab('request')}
        >
          <Text style={[styles.tabPillText, activeTab === 'request' && styles.tabPillTextActive]}>
            Leave Request
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabPill, activeTab === 'history' && styles.tabPillActive]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabPillText, activeTab === 'history' && styles.tabPillTextActive]}>
            Leave History
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'request' ? (
        /* Leave Request Form Card */
        <Card style={styles.formCard} elevation="sm">
          {formError ? <Alert type="error">{formError}</Alert> : null}

          {/* Leave Type */}
          <Text style={styles.fieldLabel}>Leave Type</Text>
          <View style={styles.toggleRow}>
            {[
              { key: 'CL', label: `Casual Leave (${balance?.CL?.available ?? 0} Left)` },
              { key: 'EL', label: `Earned Leave (${balance?.EL?.available ?? 0} Left)` },
            ].map((t) => {
              const isSelected = leaveType === t.key;
              return (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.chipBtn, isSelected && styles.chipBtnActive]}
                  onPress={() => setLeaveType(t.key)}
                  activeOpacity={0.75}
                >
                  {isSelected && (
                    <MaterialCommunityIcons
                      name="check"
                      size={14}
                      color={colors.onPrimaryContainer}
                      style={{ marginRight: 4 }}
                    />
                  )}
                  <Text style={[styles.chipBtnText, isSelected && styles.chipBtnTextActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Date Pickers */}
          <Input
            label="From Date"
            value={fromDate}
            onChangeText={setFromDate}
            placeholder="YYYY-MM-DD"
            prefixIcon="calendar-outline"
          />

          <Input
            label="To Date"
            value={toDate}
            onChangeText={setToDate}
            placeholder="YYYY-MM-DD"
            prefixIcon="calendar-outline"
          />

          <Input
            label="Reason (Optional)"
            value={reason}
            onChangeText={setReason}
            placeholder="Enter reason for leave"
            multiline
            numberOfLines={3}
          />

          <Button
            title="Submit Request"
            onPress={handleApply}
            loading={submitting}
            style={styles.submitBtn}
          />
        </Card>
      ) : (
        /* Leave History */
        <View style={styles.historySection}>
          {leaves.length === 0 ? (
            <Card style={styles.emptyCard}>
              <MaterialCommunityIcons name="calendar-blank" size={40} color={colors.textMuted} />
              <Text style={styles.emptyText}>No leave requests recorded yet.</Text>
            </Card>
          ) : (
            <View style={styles.historyList}>
              {leaves.map((item) => (
                <Card key={item._id} style={styles.leaveItemCard} elevation="sm">
                  <View style={styles.itemHeader}>
                    <View style={styles.itemTypeRow}>
                      <Text style={styles.itemType}>{item.type}</Text>
                      <Text style={styles.itemDays}>
                        • {item.days} {item.days === 1 ? 'day' : 'days'}
                      </Text>
                    </View>
                    <Badge label={item.status} variant={getStatusVariant(item.status)} />
                  </View>

                  <Text style={styles.itemDates}>
                    {formatDate(item.fromDate)}
                    {item.fromDate !== item.toDate ? ` to ${formatDate(item.toDate)}` : ''}
                  </Text>

                  {item.reason ? (
                    <Text style={styles.itemReason} numberOfLines={2}>
                      "{item.reason}"
                    </Text>
                  ) : null}

                  {item.status === 'PENDING' && (
                    <TouchableOpacity
                      onPress={() => handleCancelLeave(item)}
                      style={styles.cancelLink}
                    >
                      <MaterialCommunityIcons name="close-circle-outline" size={16} color={colors.danger} />
                      <Text style={styles.cancelLinkText}>Cancel Request</Text>
                    </TouchableOpacity>
                  )}
                </Card>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Apply Leave Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCard} elevation="lg">
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Apply for Leave</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialCommunityIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {formError ? <Alert type="error">{formError}</Alert> : null}

            {/* Current Balance Indicator */}
            <View style={styles.modalBalancePill}>
              <MaterialCommunityIcons name="wallet-outline" size={16} color={colors.onPrimaryContainer} />
              <Text style={styles.modalBalanceText}>
                Balance: {balance?.CL?.available ?? 0} CL Available • {balance?.EL?.available ?? 0} EL Available
              </Text>
            </View>

            {/* Leave Type MD3 Chips */}
            <Text style={styles.fieldLabel}>Leave Type *</Text>
            <View style={styles.toggleRow}>
              {[
                { key: 'CL', label: `Casual Leave (${balance?.CL?.available ?? 0})` },
                { key: 'EL', label: `Earned Leave (${balance?.EL?.available ?? 0})` },
              ].map((t) => {
                const isSelected = leaveType === t.key;
                return (
                  <TouchableOpacity
                    key={t.key}
                    style={[styles.chipBtn, isSelected && styles.chipBtnActive]}
                    onPress={() => setLeaveType(t.key)}
                    activeOpacity={0.75}
                  >
                    {isSelected && (
                      <MaterialCommunityIcons
                        name="check"
                        size={14}
                        color={colors.onPrimaryContainer}
                        style={{ marginRight: 4 }}
                      />
                    )}
                    <Text style={[styles.chipBtnText, isSelected && styles.chipBtnTextActive]}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Duration MD3 Chips */}
            <Text style={styles.fieldLabel}>Duration</Text>
            <View style={styles.toggleRow}>
              {[
                { key: '', label: 'Full Day' },
                { key: 'FIRST_HALF', label: '1st Half' },
                { key: 'SECOND_HALF', label: '2nd Half' },
              ].map((d) => {
                const isSelected = halfDay === d.key;
                return (
                  <TouchableOpacity
                    key={d.key || 'full'}
                    style={[styles.chipBtn, isSelected && styles.chipBtnActive]}
                    onPress={() => setHalfDay(d.key)}
                    activeOpacity={0.75}
                  >
                    {isSelected && (
                      <MaterialCommunityIcons
                        name="check"
                        size={14}
                        color={colors.onPrimaryContainer}
                        style={{ marginRight: 4 }}
                      />
                    )}
                    <Text style={[styles.chipBtnText, isSelected && styles.chipBtnTextActive]}>
                      {d.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Date Inputs */}
            <Input
              label="From Date (YYYY-MM-DD) *"
              value={fromDate}
              onChangeText={setFromDate}
              placeholder="YYYY-MM-DD"
              prefixIcon="calendar"
            />

            {!halfDay && (
              <Input
                label="To Date (YYYY-MM-DD) *"
                value={toDate}
                onChangeText={setToDate}
                placeholder="YYYY-MM-DD"
                prefixIcon="calendar"
              />
            )}

            <Input
              label="Reason for Leave *"
              value={reason}
              onChangeText={setReason}
              placeholder="e.g. Family function / doctor appointment"
              multiline
              numberOfLines={3}
            />

            <Button
              title="Submit Leave Request"
              onPress={handleApply}
              loading={submitting}
              icon="send"
              style={styles.modalSubmitBtn}
            />
          </Card>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: 12,
  },
  balanceGrid: {
    gap: 12,
    marginBottom: 16,
  },
  balanceCard: {
    padding: 16,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  balanceTypeTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  balanceCountRow: {
    flexDirection: 'row',
    backgroundColor: colors.bg,
    borderRadius: borderRadius.md,
    padding: 10,
  },
  countBox: {
    flex: 1,
    alignItems: 'center',
  },
  countVal: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
  },
  countLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  applyBtn: {
    marginBottom: 24,
  },
  emptyCard: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: 8,
  },
  historyList: {
    gap: 10,
  },
  leaveItemCard: {
    padding: 16,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  itemTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemType: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  itemDays: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginLeft: 6,
  },
  itemDates: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    fontWeight: typography.weights.medium,
    marginBottom: 6,
  },
  itemReason: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  cancelLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  cancelLinkText: {
    fontSize: typography.sizes.xs,
    color: colors.danger,
    fontWeight: typography.weights.semibold,
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  fieldLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text,
    marginBottom: 6,
  },
  modalBalancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primaryContainer,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: borderRadius.md,
    marginBottom: 16,
  },
  modalBalanceText: {
    fontSize: typography.sizes.xs,
    color: colors.onPrimaryContainer,
    fontWeight: typography.weights.semibold,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  chipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: borderRadius.pill,
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  chipBtnActive: {
    backgroundColor: colors.primaryContainer,
    borderColor: colors.primary,
  },
  chipBtnText: {
    fontSize: typography.sizes.xs,
    color: colors.onSurfaceVariant,
    fontWeight: typography.weights.medium,
  },
  chipBtnTextActive: {
    color: colors.onPrimaryContainer,
    fontWeight: typography.weights.bold,
  },
  modalSubmitBtn: {
    marginTop: 10,
  },
  tabPillRow: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    borderRadius: borderRadius.pill,
    padding: 4,
    marginBottom: 16,
  },
  tabPill: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.pill,
  },
  tabPillActive: {
    backgroundColor: colors.primary,
  },
  tabPillText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  tabPillTextActive: {
    color: colors.white,
    fontWeight: typography.weights.bold,
  },
  formCard: {
    padding: 18,
    borderRadius: 16,
    marginBottom: 20,
  },
  submitBtn: {
    marginTop: 8,
  },
  historySection: {
    marginTop: 4,
  },
});
