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
  approveCorrectionApi,
  listCorrectionsApi,
  rejectCorrectionApi,
} from '../../api/punchCorrectionApi.js';
import Alert from '../../components/common/Alert.jsx';
import Badge from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import Header from '../../components/common/Header.jsx';
import Input from '../../components/common/Input.jsx';
import Loader from '../../components/common/Loader.jsx';
import ScreenWrapper from '../../components/common/ScreenWrapper.jsx';
import { borderRadius, colors, shadows, typography } from '../../theme/index.js';
import { formatDate, formatTime } from '../../utils/format.js';
import { initials } from '../../utils/roles.js';

export default function AdminCorrectionsScreen({ navigation }) {
  const [statusFilter, setStatusFilter] = useState('PENDING'); // 'PENDING' | 'APPROVED' | 'REJECTED' | 'all'
  const [corrections, setCorrections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionMsg, setActionMsg] = useState({ type: 'success', text: '' });
  const [busyId, setBusyId] = useState(null);

  // Reject Modal
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectingItem, setRejectingItem] = useState(null);
  const [rejectNote, setRejectNote] = useState('');

  const fetchCorrections = useCallback(async () => {
    try {
      const res = await listCorrectionsApi({
        status: statusFilter === 'all' ? undefined : statusFilter,
      });
      setCorrections(res?.data?.items || []);
    } catch (err) {
      setActionMsg({ type: 'error', text: err.message || 'Failed to load corrections.' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchCorrections();
  }, [fetchCorrections]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCorrections();
  };

  const handleApprove = (item) => {
    const staffName = item.userId?.name || 'this staff member';
    NativeAlert.alert(
      `Approve Punch Correction for ${staffName}?`,
      `Attendance for ${formatDate(item.date)} will be updated to In: ${
        item.punchIn ? formatTime(item.punchIn) : 'Unchanged'
      }, Out: ${item.punchOut ? formatTime(item.punchOut) : 'Unchanged'}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve Fix',
          style: 'default',
          onPress: async () => {
            setBusyId(item._id);
            try {
              await approveCorrectionApi(item._id);
              setActionMsg({ type: 'success', text: `Punch fix approved for ${staffName}.` });
              fetchCorrections();
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

  const openRejectModal = (item) => {
    setRejectingItem(item);
    setRejectNote('');
    setRejectModalVisible(true);
  };

  const handleConfirmReject = async () => {
    if (!rejectingItem) return;
    setBusyId(rejectingItem._id);
    try {
      await rejectCorrectionApi(rejectingItem._id, rejectNote.trim() || undefined);
      setActionMsg({ type: 'success', text: 'Correction request rejected.' });
      setRejectModalVisible(false);
      fetchCorrections();
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
      <Header
        title="Punch Corrections"
        onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
      />

      {actionMsg.text ? <Alert type={actionMsg.type}>{actionMsg.text}</Alert> : null}

      {/* MD3 Filter Chips */}
      <View style={styles.filterRow}>
        {[
          { key: 'PENDING', label: 'Pending' },
          { key: 'APPROVED', label: 'Approved' },
          { key: 'REJECTED', label: 'Rejected' },
          { key: 'all', label: 'All' },
        ].map((tab) => {
          const isSelected = statusFilter === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.filterChip, isSelected && styles.filterChipActive]}
              onPress={() => setStatusFilter(tab.key)}
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
              <Text
                style={[
                  styles.filterChipText,
                  isSelected && styles.filterChipTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Corrections List */}
      {loading ? (
        <Loader message="Loading correction requests..." />
      ) : corrections.length === 0 ? (
        <Card style={styles.emptyCard}>
          <MaterialCommunityIcons name="timer-sand-complete" size={44} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No {statusFilter.toLowerCase()} requests</Text>
          <Text style={styles.emptySub}>
            {statusFilter === 'PENDING'
              ? 'No pending punch fixes to review.'
              : 'No correction requests in this filter.'}
          </Text>
        </Card>
      ) : (
        <View style={styles.list}>
          {corrections.map((item) => (
            <Card key={item._id} style={styles.card} elevation="sm">
              <View style={styles.cardHeader}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials(item.userId?.name || 'EM')}</Text>
                </View>
                <View style={styles.staffInfo}>
                  <Text style={styles.staffName}>{item.userId?.name || 'Staff'}</Text>
                  <Text style={styles.staffCode}>
                    Date: {formatDate(item.date)}
                  </Text>
                </View>
                <Badge label={item.status} variant={getStatusVariant(item.status)} size="sm" />
              </View>

              <View style={styles.timesBox}>
                <View style={styles.timeCol}>
                  <Text style={styles.timeLabel}>Requested In</Text>
                  <Text style={styles.timeVal}>
                    {item.punchIn ? formatTime(item.punchIn) : '--:--'}
                  </Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.timeCol}>
                  <Text style={styles.timeLabel}>Requested Out</Text>
                  <Text style={styles.timeVal}>
                    {item.punchOut ? formatTime(item.punchOut) : '--:--'}
                  </Text>
                </View>
              </View>

              {item.reason ? (
                <Text style={styles.reasonText} numberOfLines={2}>
                  Reason: "{item.reason}"
                </Text>
              ) : null}

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
                    title="Approve Fix"
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

      {/* Reject Modal */}
      <Modal
        visible={rejectModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRejectModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCard} elevation="lg">
            <Text style={styles.modalTitle}>Reject Punch Correction</Text>
            <Text style={styles.modalSubtitle}>Provide an optional rejection reason:</Text>

            <Input
              value={rejectNote}
              onChangeText={setRejectNote}
              placeholder="e.g. CCTV showed punch was not during hours"
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
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: borderRadius.pill,
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  filterChipActive: {
    backgroundColor: colors.primaryContainer,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: typography.sizes.xs,
    color: colors.onSurfaceVariant,
    fontWeight: typography.weights.medium,
  },
  filterChipTextActive: {
    color: colors.onPrimaryContainer,
    fontWeight: typography.weights.bold,
  },
  list: {
    gap: 12,
  },
  card: {
    padding: 16,
  },
  cardHeader: {
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
  staffCode: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  timesBox: {
    flexDirection: 'row',
    backgroundColor: colors.bg,
    borderRadius: borderRadius.md,
    padding: 10,
    marginBottom: 8,
  },
  timeCol: {
    flex: 1,
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  timeVal: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginTop: 2,
  },
  divider: {
    width: 1,
    backgroundColor: colors.border,
  },
  reasonText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 4,
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
