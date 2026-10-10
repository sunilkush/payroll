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
import { approveLeaveApi, listLeavesApi, rejectLeaveApi } from '../../api/leaveApi.js';
import Alert from '../../components/common/Alert.jsx';
import Badge from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import Header from '../../components/common/Header.jsx';
import Input from '../../components/common/Input.jsx';
import Loader from '../../components/common/Loader.jsx';
import ScreenWrapper from '../../components/common/ScreenWrapper.jsx';
import { borderRadius, colors, shadows, typography } from '../../theme/index.js';
import { formatDate } from '../../utils/format.js';
import { initials } from '../../utils/roles.js';

export default function AdminLeavesScreen({ navigation }) {
  const [statusFilter, setStatusFilter] = useState('PENDING'); // 'PENDING' | 'APPROVED' | 'REJECTED' | 'all'
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionMsg, setActionMsg] = useState({ type: 'success', text: '' });

  // Reject Modal state
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectingLeave, setRejectingLeave] = useState(null);
  const [rejectNote, setRejectNote] = useState('');
  const [busyId, setBusyId] = useState(null);

  const fetchLeaves = useCallback(async () => {
    try {
      const res = await listLeavesApi({
        status: statusFilter === 'all' ? undefined : statusFilter,
      });
      setLeaves(res?.data?.items || []);
    } catch (err) {
      setActionMsg({ type: 'error', text: err.message || 'Failed to load leave requests.' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchLeaves();
  }, [fetchLeaves]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLeaves();
  };

  const handleApprove = (leave) => {
    const staffName = leave.userId?.name || 'this employee';
    NativeAlert.alert(
      `Approve Leave for ${staffName}?`,
      `${leave.days} day(s) of ${leave.type} from ${formatDate(leave.fromDate)} to ${formatDate(
        leave.toDate
      )}. This will be marked as paid approved leave.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          style: 'default',
          onPress: async () => {
            setBusyId(leave._id);
            try {
              await approveLeaveApi(leave._id);
              setActionMsg({ type: 'success', text: `Leave approved for ${staffName}.` });
              fetchLeaves();
              setTimeout(() => setActionMsg({ type: 'success', text: '' }), 3000);
            } catch (err) {
              setActionMsg({ type: 'error', text: err.message });
            } finally {
              setBusyId(null);
            }
          },
        },
      ]
    );
  };

  const openRejectModal = (leave) => {
    setRejectingLeave(leave);
    setRejectNote('');
    setRejectModalVisible(true);
  };

  const handleConfirmReject = async () => {
    if (!rejectingLeave) return;
    setBusyId(rejectingLeave._id);
    try {
      await rejectLeaveApi(rejectingLeave._id, rejectNote.trim() || undefined);
      setActionMsg({
        type: 'success',
        text: `Leave rejected. The balance has been returned to employee.`,
      });
      setRejectModalVisible(false);
      fetchLeaves();
      setTimeout(() => setActionMsg({ type: 'success', text: '' }), 3000);
    } catch (err) {
      setActionMsg({ type: 'error', text: err.message });
    } finally {
      setBusyId(null);
    }
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

  return (
    <ScreenWrapper contentContainerStyle={styles.container} scrollable>
      <Header title="Leave Requests" />

      {actionMsg.text ? <Alert type={actionMsg.type}>{actionMsg.text}</Alert> : null}

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {[
          { key: 'PENDING', label: 'Pending' },
          { key: 'APPROVED', label: 'Approved' },
          { key: 'REJECTED', label: 'Rejected' },
          { key: 'all', label: 'All' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.filterBtn, statusFilter === tab.key && styles.filterBtnActive]}
            onPress={() => setStatusFilter(tab.key)}
          >
            <Text
              style={[
                styles.filterBtnText,
                statusFilter === tab.key && styles.filterBtnTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Leaves List */}
      {loading ? (
        <Loader message="Loading leave applications..." />
      ) : leaves.length === 0 ? (
        <Card style={styles.emptyCard}>
          <MaterialCommunityIcons name="calendar-check" size={44} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No {statusFilter.toLowerCase()} requests</Text>
          <Text style={styles.emptySub}>
            {statusFilter === 'PENDING'
              ? 'All caught up! No pending leave requests to review.'
              : 'No leave applications in this category.'}
          </Text>
        </Card>
      ) : (
        <View style={styles.leavesList}>
          {leaves.map((item) => (
            <Card key={item._id} style={styles.leaveCard} elevation="sm">
              <View style={styles.leaveHeader}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials(item.userId?.name || 'EM')}</Text>
                </View>
                <View style={styles.staffInfo}>
                  <Text style={styles.staffName}>{item.userId?.name || 'Staff'}</Text>
                  <Text style={styles.staffEmail}>{item.userId?.email || ''}</Text>
                </View>
                <Badge label={item.status} variant={getStatusVariant(item.status)} />
              </View>

              <View style={styles.leaveMetaBox}>
                <View style={styles.leaveTypeRow}>
                  <Text style={styles.leaveTypeBadge}>
                    {item.type} • {item.days} {item.days === 1 ? 'day' : 'days'}
                    {item.halfDay ? ` (${item.halfDay.replace('_', ' ').toLowerCase()})` : ''}
                  </Text>
                </View>

                <Text style={styles.leaveDates}>
                  {formatDate(item.fromDate)}
                  {item.fromDate !== item.toDate ? ` to ${formatDate(item.toDate)}` : ''}
                </Text>

                {item.reason ? (
                  <Text style={styles.leaveReason} numberOfLines={3}>
                    "{item.reason}"
                  </Text>
                ) : null}
              </View>

              {/* Action Buttons for Pending leaves */}
              {item.status === 'PENDING' && (
                <View style={styles.actionRow}>
                  <Button
                    title="Reject"
                    variant="danger"
                    size="sm"
                    icon="close"
                    onPress={() => openRejectModal(item)}
                    disabled={busyId === item._id}
                    style={styles.actionBtn}
                  />
                  <Button
                    title="Approve"
                    variant="primary"
                    size="sm"
                    icon="check"
                    onPress={() => handleApprove(item)}
                    loading={busyId === item._id}
                    disabled={busyId === item._id}
                    style={styles.actionBtn}
                  />
                </View>
              )}
            </Card>
          ))}
        </View>
      )}

      {/* Reject Reason Modal */}
      <Modal
        visible={rejectModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRejectModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCard} elevation="lg">
            <Text style={styles.modalTitle}>Reject Leave Request</Text>
            <Text style={styles.modalSubtitle}>
              Optionally provide a reason for rejecting this leave:
            </Text>

            <Input
              value={rejectNote}
              onChangeText={setRejectNote}
              placeholder="e.g. Critical deployment on these dates"
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalBtnRow}>
              <Button
                title="Cancel"
                variant="secondary"
                onPress={() => setRejectModalVisible(false)}
                style={styles.modalActionBtn}
              />
              <Button
                title="Confirm Reject"
                variant="danger"
                onPress={handleConfirmReject}
                style={styles.modalActionBtn}
              />
            </View>
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
  filterRow: {
    flexDirection: 'row',
    backgroundColor: colors.borderLight,
    borderRadius: borderRadius.md,
    padding: 3,
    marginBottom: 16,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  filterBtnActive: {
    backgroundColor: colors.bgCard,
    ...shadows.sm,
  },
  filterBtnText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  filterBtnTextActive: {
    color: colors.primary,
    fontWeight: typography.weights.bold,
  },
  leavesList: {
    gap: 12,
  },
  leaveCard: {
    padding: 16,
  },
  leaveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  staffInfo: {
    flex: 1,
  },
  staffName: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  staffEmail: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 1,
  },
  leaveMetaBox: {
    backgroundColor: colors.bg,
    borderRadius: borderRadius.md,
    padding: 12,
  },
  leaveTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  leaveTypeBadge: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  leaveDates: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text,
    marginBottom: 6,
  },
  leaveReason: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: 12,
  },
  actionBtn: {
    flex: 1,
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
    padding: 20,
  },
  modalCard: {
    padding: 20,
  },
  modalTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  modalActionBtn: {
    flex: 1,
  },
});
