import { useCallback, useEffect, useState } from 'react';
import {
  Alert as NativeAlert,
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

  // Pill tab: 'request' | 'history'
  const [activeTab, setActiveTab] = useState('request');

  // Form state
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
      const [balRes, listRes] = await Promise.allSettled([
        getLeaveBalanceApi(),
        listLeavesApi({ page: 1 }),
      ]);

      if (balRes.status === 'fulfilled') {
        setBalance(balRes.value?.data?.balance || null);
      } else {
        console.warn('Leave balance fetch notice:', balRes.reason?.message);
      }

      if (listRes.status === 'fulfilled') {
        setLeaves(listRes.value?.data?.items || []);
      } else {
        setActionError(listRes.reason?.message || 'Failed to load leaves.');
      }
    } catch (err) {
      setActionError(err.message || 'Failed to load leave records.');
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
    setFormError('');

    const cleanReason = reason.trim();
    if (!cleanReason) {
      setFormError('Please enter a reason for your leave request.');
      return;
    }

    const cleanFrom = (fromDate || '').trim();
    const cleanTo = halfDay ? cleanFrom : ((toDate || '').trim() || cleanFrom);

    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(cleanFrom)) {
      setFormError('Please enter From Date in YYYY-MM-DD format (e.g. 2026-10-15).');
      return;
    }
    if (!halfDay && !datePattern.test(cleanTo)) {
      setFormError('Please enter To Date in YYYY-MM-DD format (e.g. 2026-10-15).');
      return;
    }
    if (cleanTo < cleanFrom) {
      setFormError('To Date cannot be earlier than From Date.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        type: leaveType,
        fromDate: cleanFrom,
        toDate: cleanTo,
        halfDay: halfDay || undefined,
        reason: cleanReason,
      };

      const res = await applyLeaveApi(payload);
      setReason('');
      setActionSuccess(
        `Leave request submitted for ${res?.data?.leave?.days || (halfDay ? 0.5 : 1)} day(s) of ${leaveType}. Waiting for approval.`
      );
      setActiveTab('history');
      loadData();
      setTimeout(() => setActionSuccess(''), 5000);
    } catch (err) {
      const serverMsg = err.errors?.[0]?.message || err.message || 'Failed to submit leave request.';
      setFormError(serverMsg);
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

  const clLeft = balance?.CL?.available ?? 0;
  const elLeft = balance?.EL?.available ?? 0;

  return (
    <ScreenWrapper contentContainerStyle={styles.container} scrollable>
      <Header
        title="Apply Leave"
        onBack={navigation.canGoBack() ? () => navigation.goBack() : () => navigation.navigate('StaffHome')}
      />

      {actionSuccess ? <Alert type="success">{actionSuccess}</Alert> : null}
      {actionError ? <Alert type="error">{actionError}</Alert> : null}

      {/* Balance Summary Cards */}
      <View style={styles.balanceGrid}>
        <Card style={styles.balanceCard} elevation="xs">
          <View style={styles.balanceHeader}>
            <View style={styles.balanceIconWrap}>
              <MaterialCommunityIcons name="clock-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.balanceInfo}>
              <Text style={styles.balanceLabel}>Casual Leave (CL)</Text>
              <Text style={styles.balanceCount}>
                {clLeft} <Text style={styles.balanceUnit}>Days Available</Text>
              </Text>
            </View>
          </View>
        </Card>

        <Card style={styles.balanceCard} elevation="xs">
          <View style={styles.balanceHeader}>
            <View style={[styles.balanceIconWrap, { backgroundColor: '#ECFDF5' }]}>
              <MaterialCommunityIcons name="wallet-outline" size={20} color="#059669" />
            </View>
            <View style={styles.balanceInfo}>
              <Text style={styles.balanceLabel}>Earned Leave (EL)</Text>
              <Text style={styles.balanceCount}>
                {elLeft} <Text style={styles.balanceUnit}>Days Available</Text>
              </Text>
            </View>
          </View>
        </Card>
      </View>

      {/* Pill Tabs: Leave Request vs Leave History */}
      <View style={styles.tabPillRow}>
        <TouchableOpacity
          style={[styles.tabPill, activeTab === 'request' && styles.tabPillActive]}
          onPress={() => setActiveTab('request')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabPillText, activeTab === 'request' && styles.tabPillTextActive]}>
            Leave Request
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabPill, activeTab === 'history' && styles.tabPillActive]}
          onPress={() => setActiveTab('history')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabPillText, activeTab === 'history' && styles.tabPillTextActive]}>
            Leave History ({leaves.length})
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'request' ? (
        /* Leave Request Form Card */
        <Card style={styles.formCard} elevation="sm">
          {formError ? <Alert type="error">{formError}</Alert> : null}

          {/* Leave Type */}
          <Text style={styles.fieldLabel}>Leave Type *</Text>
          <View style={styles.toggleRow}>
            {[
              { key: 'CL', label: `Casual Leave (${clLeft} Left)`, icon: 'clock-outline' },
              { key: 'EL', label: `Earned Leave (${elLeft} Left)`, icon: 'calendar-check' },
            ].map((t) => {
              const isSelected = leaveType === t.key;
              return (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.chipBtn, isSelected && styles.chipBtnActive]}
                  onPress={() => setLeaveType(t.key)}
                  activeOpacity={0.75}
                >
                  <MaterialCommunityIcons
                    name={isSelected ? 'check-circle' : t.icon}
                    size={16}
                    color={isSelected ? '#FFFFFF' : colors.textSecondary}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.chipBtnText, isSelected && styles.chipBtnTextActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Duration */}
          <Text style={styles.fieldLabel}>Duration *</Text>
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
                  <MaterialCommunityIcons
                    name={isSelected ? 'check-circle' : 'circle-outline'}
                    size={16}
                    color={isSelected ? '#FFFFFF' : colors.textSecondary}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.chipBtnText, isSelected && styles.chipBtnTextActive]}>
                    {d.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Date Pickers */}
          <Input
            label="From Date (YYYY-MM-DD) *"
            value={fromDate}
            onChangeText={(t) => {
              setFromDate(t);
              if (halfDay || !toDate) setToDate(t);
            }}
            placeholder="YYYY-MM-DD"
            prefixIcon="calendar"
            helper="e.g. 2026-10-15"
          />

          {!halfDay && (
            <Input
              label="To Date (YYYY-MM-DD) *"
              value={toDate}
              onChangeText={setToDate}
              placeholder="YYYY-MM-DD"
              prefixIcon="calendar"
              helper="Same as From Date for single-day leave"
            />
          )}

          <Input
            label="Reason for Leave *"
            value={reason}
            onChangeText={setReason}
            placeholder="e.g. Doctor appointment, family function"
            multiline
            numberOfLines={3}
            prefixIcon="text"
          />

          <Button
            title="Submit Leave Request"
            onPress={handleApply}
            loading={submitting}
            icon="send"
            style={styles.submitBtn}
          />
        </Card>
      ) : (
        /* Leave History */
        <View style={styles.historySection}>
          {leaves.length === 0 ? (
            <Card style={styles.emptyCard} elevation="xs">
              <MaterialCommunityIcons name="calendar-blank-outline" size={44} color={colors.textSecondary} />
              <Text style={styles.emptyText}>No leave requests recorded yet.</Text>
              <Text style={styles.emptySubText}>Submitted leave requests will appear here with real-time approval status.</Text>
            </Card>
          ) : (
            <View style={styles.historyList}>
              {leaves.map((item) => (
                <Card key={item._id} style={styles.leaveItemCard} elevation="xs">
                  <View style={styles.itemHeader}>
                    <View style={styles.itemTypeRow}>
                      <View style={styles.typeBadgeCircle}>
                        <MaterialCommunityIcons
                          name={item.type === 'CL' ? 'clock-outline' : 'calendar-check'}
                          size={16}
                          color={colors.primary}
                        />
                      </View>
                      <Text style={styles.itemType}>{item.type === 'CL' ? 'Casual Leave' : 'Earned Leave'}</Text>
                      <Text style={styles.itemDays}>
                        • {item.days} {item.days === 1 ? 'day' : 'days'}
                      </Text>
                    </View>
                    <Badge label={item.status} variant={getStatusVariant(item.status)} />
                  </View>

                  <Text style={styles.itemDates}>
                    {formatDate(item.fromDate)}
                    {item.fromDate !== item.toDate ? ` to ${formatDate(item.toDate)}` : ''}
                    {item.halfDay ? ` (${item.halfDay === 'FIRST_HALF' ? '1st Half' : '2nd Half'})` : ''}
                  </Text>

                  {item.reason ? (
                    <Text style={styles.itemReason} numberOfLines={2}>
                      "{item.reason}"
                    </Text>
                  ) : null}

                  {item.actionNote ? (
                    <Text style={styles.itemNote}>
                      Admin note: {item.actionNote}
                    </Text>
                  ) : null}

                  {item.status === 'PENDING' && (
                    <TouchableOpacity
                      onPress={() => handleCancelLeave(item)}
                      style={styles.cancelLink}
                      activeOpacity={0.7}
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
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 36,
  },
  balanceGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  balanceCard: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  balanceIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceInfo: {
    flex: 1,
  },
  balanceLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  balanceCount: {
    fontSize: 18,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
    marginTop: 2,
  },
  balanceUnit: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: typography.weights.normal,
  },
  tabPillRow: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
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
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  tabPillTextActive: {
    color: '#FFFFFF',
    fontWeight: typography.weights.bold,
  },
  formCard: {
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    marginBottom: 20,
    ...shadows.sm,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: typography.weights.semibold,
    color: '#0F172A',
    marginBottom: 8,
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
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: borderRadius.pill,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipBtnText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  chipBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: typography.weights.bold,
  },
  submitBtn: {
    marginTop: 10,
  },
  historySection: {
    marginTop: 4,
  },
  emptyCard: {
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
    marginTop: 10,
  },
  emptySubText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 19,
  },
  historyList: {
    gap: 10,
  },
  leaveItemCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeBadgeCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  itemType: {
    fontSize: 15,
    fontWeight: typography.weights.bold,
    color: '#0F172A',
  },
  itemDays: {
    fontSize: 13,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  itemDates: {
    fontSize: 14,
    color: '#334155',
    fontWeight: typography.weights.medium,
    marginBottom: 6,
  },
  itemReason: {
    fontSize: 13,
    color: colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: 19,
  },
  itemNote: {
    fontSize: 13,
    color: colors.primary,
    marginTop: 4,
  },
  cancelLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: '#FEE2E2',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: borderRadius.pill,
  },
  cancelLinkText: {
    fontSize: 13,
    color: colors.danger,
    fontWeight: typography.weights.semibold,
    marginLeft: 4,
  },
});
