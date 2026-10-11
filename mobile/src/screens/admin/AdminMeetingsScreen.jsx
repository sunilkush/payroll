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
import { listClientsApi } from '../../api/clientApi.js';
import {
  cancelMeetingApi,
  createMeetingApi,
  listMeetingsApi,
} from '../../api/meetingApi.js';
import { listStaffApi } from '../../api/staffApi.js';
import Alert from '../../components/common/Alert.jsx';
import Badge from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import Header from '../../components/common/Header.jsx';
import Input from '../../components/common/Input.jsx';
import Loader from '../../components/common/Loader.jsx';
import ScreenWrapper from '../../components/common/ScreenWrapper.jsx';
import { borderRadius, colors, shadows, typography } from '../../theme/index.js';
import { formatDate, formatTime, todayLocal } from '../../utils/format.js';

export default function AdminMeetingsScreen({ navigation }) {
  const [meetings, setMeetings] = useState([]);
  const [clients, setClients] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [feedback, setFeedback] = useState({ type: 'success', text: '' });

  // Schedule Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [title, setTitle] = useState('');
  const [purpose, setPurpose] = useState('');
  const [date, setDate] = useState(todayLocal());
  const [startTime, setStartTime] = useState('11:00');
  const [endTime, setEndTime] = useState('12:00');
  const [submitting, setSubmitting] = useState(false);

  // Cancel Modal State
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancellingMeeting, setCancellingMeeting] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setFeedback({ type: 'success', text: '' });
      const [meetingsRes, clientsRes, staffRes] = await Promise.allSettled([
        listMeetingsApi(),
        listClientsApi(),
        listStaffApi(),
      ]);
      if (meetingsRes.status === 'fulfilled') {
        setMeetings(meetingsRes.value?.data?.items || meetingsRes.value?.data || []);
      }
      if (clientsRes.status === 'fulfilled') {
        setClients(clientsRes.value?.data?.items || clientsRes.value?.data || []);
      }
      if (staffRes.status === 'fulfilled') {
        setStaffList(
          staffRes.value?.data?.items ||
            staffRes.value?.data?.users ||
            staffRes.value?.data ||
            []
        );
      }
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to load visits data.' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const openScheduleModal = () => {
    if (clients.length === 0) {
      NativeAlert.alert(
        'No Clients Registered',
        'Please add a client under Client Accounts before scheduling a meeting.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Add Client', onPress: () => navigation.navigate('AdminClients') },
        ]
      );
      return;
    }
    setSelectedClientId(clients[0]?._id || '');
    setSelectedStaffId(staffList[0]?._id || '');
    setTitle('');
    setPurpose('');
    setDate(todayLocal());
    setStartTime('11:00');
    setEndTime('12:00');
    setModalVisible(true);
  };

  const handleCreateMeeting = async () => {
    if (!title.trim()) {
      NativeAlert.alert('Validation Error', 'Please enter a meeting title.');
      return;
    }
    if (!selectedClientId) {
      NativeAlert.alert('Validation Error', 'Please select a client.');
      return;
    }
    if (!selectedStaffId) {
      NativeAlert.alert('Validation Error', 'Please assign a sales staff member.');
      return;
    }

    const clientObj = clients.find((c) => c._id === selectedClientId);

    setSubmitting(true);
    try {
      const payload = {
        clientId: selectedClientId,
        salesManagerId: selectedStaffId,
        title: title.trim(),
        purpose: purpose.trim(),
        date,
        startTime,
        endTime,
        location: {
          address: clientObj?.address || 'Client Office',
          lat: clientObj?.lat || 28.6139,
          lng: clientObj?.lng || 77.209,
        },
      };

      await createMeetingApi(payload);
      setModalVisible(false);
      setFeedback({ type: 'success', text: `Meeting "${title}" scheduled successfully!` });
      fetchData();
      setTimeout(() => setFeedback({ type: 'success', text: '' }), 4000);
    } catch (err) {
      NativeAlert.alert('Scheduling Error', err.message || 'Failed to schedule meeting.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenCancel = (meeting) => {
    setCancellingMeeting(meeting);
    setCancelReason('');
    setCancelModalVisible(true);
  };

  const handleConfirmCancel = async () => {
    if (!cancellingMeeting) return;
    setCancelling(true);
    try {
      await cancelMeetingApi(cancellingMeeting._id, cancelReason.trim());
      setCancelModalVisible(false);
      setFeedback({ type: 'success', text: `Meeting "${cancellingMeeting.title}" cancelled.` });
      fetchData();
      setTimeout(() => setFeedback({ type: 'success', text: '' }), 3000);
    } catch (err) {
      NativeAlert.alert('Error', err.message || 'Failed to cancel meeting.');
    } finally {
      setCancelling(false);
    }
  };

  const filteredMeetings = meetings.filter((m) => {
    if (statusFilter === 'ALL') return true;
    return m.status === statusFilter;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'CHECKED_IN':
        return { label: 'In Progress', variant: 'warning' };
      case 'COMPLETED':
        return { label: 'Completed', variant: 'success' };
      case 'CANCELLED':
        return { label: 'Cancelled', variant: 'danger' };
      case 'SCHEDULED':
      default:
        return { label: 'Scheduled', variant: 'primary' };
    }
  };

  return (
    <ScreenWrapper scrollable={false}>
      <Header
        title="Field Visits & Meetings"
        subtitle="Track team visits & client outcomes"
        canGoBack
        onBackPress={() => navigation.goBack()}
        rightAction={{
          icon: 'plus',
          onPress: openScheduleModal,
        }}
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

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {['ALL', 'SCHEDULED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED'].map((opt) => {
          const isSelected = statusFilter === opt;
          return (
            <TouchableOpacity
              key={opt}
              style={[styles.filterChip, isSelected && styles.filterChipActive]}
              onPress={() => setStatusFilter(opt)}
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
                {opt === 'CHECKED_IN' ? 'In Progress' : opt}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <Loader message="Loading team field visits..." />
        ) : filteredMeetings.length === 0 ? (
          <EmptyState
            icon="briefcase-outline"
            title="No Visits Found"
            description={
              statusFilter !== 'ALL'
                ? `No visits matching ${statusFilter}.`
                : 'Schedule field visits for your team using the "+" button.'
            }
            actionTitle="Schedule Visit"
            onAction={openScheduleModal}
          />
        ) : (
          <View style={styles.list}>
            {filteredMeetings.map((meeting) => {
              const badge = getStatusBadge(meeting.status);
              const client = meeting.clientId || {};
              const staff = meeting.salesManagerId || {};

              return (
                <Card key={meeting._id} style={styles.meetingCard} elevation="sm">
                  <View style={styles.cardHeader}>
                    <View style={styles.titleInfo}>
                      <Text style={styles.meetingTitle}>{meeting.title}</Text>
                      <Text style={styles.clientName}>{client.name || 'Client'}</Text>
                    </View>
                    <Badge label={badge.label} variant={badge.variant} size="sm" />
                  </View>

                  <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                      <MaterialCommunityIcons name="account" size={14} color={colors.primary} />
                      <Text style={styles.metaText}>Staff: {staff.name || 'Assigned'}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <MaterialCommunityIcons name="calendar" size={14} color={colors.textSecondary} />
                      <Text style={styles.metaText}>{formatDate(meeting.date)}</Text>
                    </View>
                  </View>

                  <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                      <MaterialCommunityIcons name="clock-outline" size={14} color={colors.textSecondary} />
                      <Text style={styles.metaText}>
                        {formatTime(meeting.startAt)} - {formatTime(meeting.endAt)}
                      </Text>
                    </View>
                  </View>

                  {meeting.location?.address ? (
                    <View style={styles.locRow}>
                      <MaterialCommunityIcons name="map-marker-outline" size={14} color={colors.danger} />
                      <Text style={styles.locText} numberOfLines={1}>
                        {meeting.location.address}
                      </Text>
                    </View>
                  ) : null}

                  {meeting.status === 'COMPLETED' && meeting.result && (
                    <View style={styles.resultBox}>
                      <Text style={styles.resultLabel}>
                        Outcome: <Text style={styles.boldText}>{meeting.result.outcome}</Text>
                        {meeting.result.estimatedDealValue
                          ? ` • ₹${meeting.result.estimatedDealValue.toLocaleString('en-IN')}`
                          : ''}
                      </Text>
                      {meeting.result.remarks ? (
                        <Text style={styles.remarksText}>"{meeting.result.remarks}"</Text>
                      ) : null}
                    </View>
                  )}

                  {meeting.status === 'SCHEDULED' && (
                    <View style={styles.cardActions}>
                      <Button
                        title="Cancel Meeting"
                        variant="danger"
                        size="sm"
                        icon="cancel"
                        onPress={() => handleOpenCancel(meeting)}
                      />
                    </View>
                  )}
                </Card>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Schedule Meeting Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Schedule Field Visit</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
              <Text style={styles.fieldHeading}>Select Client *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerScroll}>
                {clients.map((c) => (
                  <TouchableOpacity
                    key={c._id}
                    style={[styles.pickerItem, selectedClientId === c._id && styles.pickerItemActive]}
                    onPress={() => setSelectedClientId(c._id)}
                  >
                    <Text style={[styles.pickerText, selectedClientId === c._id && styles.pickerTextActive]}>
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.fieldHeading}>Assign Sales Staff *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerScroll}>
                {staffList.map((s) => (
                  <TouchableOpacity
                    key={s._id}
                    style={[styles.pickerItem, selectedStaffId === s._id && styles.pickerItemActive]}
                    onPress={() => setSelectedStaffId(s._id)}
                  >
                    <Text style={[styles.pickerText, selectedStaffId === s._id && styles.pickerTextActive]}>
                      {s.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Input
                label="Meeting Title *"
                placeholder="e.g. Q4 Service Presentation & Demo"
                value={title}
                onChangeText={setTitle}
              />

              <Input
                label="Purpose / Agenda"
                placeholder="e.g. Product requirements walkthrough"
                value={purpose}
                onChangeText={setPurpose}
              />

              <Input
                label="Date (YYYY-MM-DD) *"
                placeholder="e.g. 2026-10-20"
                value={date}
                onChangeText={setDate}
              />

              <View style={styles.timesRow}>
                <Input
                  label="Start Time (HH:mm)"
                  placeholder="11:00"
                  value={startTime}
                  onChangeText={setStartTime}
                  containerStyle={styles.timeInput}
                />
                <Input
                  label="End Time (HH:mm)"
                  placeholder="12:00"
                  value={endTime}
                  onChangeText={setEndTime}
                  containerStyle={styles.timeInput}
                />
              </View>

              <Button
                title="Schedule Meeting"
                onPress={handleCreateMeeting}
                loading={submitting}
                icon="check"
                style={styles.submitModalBtn}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Cancel Meeting Modal */}
      <Modal
        visible={cancelModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setCancelModalVisible(false)}
      >
        <View style={styles.modalOverlayCenter}>
          <View style={styles.cancelModalCard}>
            <Text style={styles.cancelTitle}>Cancel Scheduled Visit</Text>
            <Text style={styles.cancelSub}>
              Are you sure you want to cancel "{cancellingMeeting?.title}"?
            </Text>

            <Input
              label="Cancellation Reason"
              placeholder="e.g. Client rescheduled due to emergency"
              value={cancelReason}
              onChangeText={setCancelReason}
              multiline
              numberOfLines={2}
            />

            <View style={styles.cancelActions}>
              <Button
                title="Keep Meeting"
                variant="outline"
                onPress={() => setCancelModalVisible(false)}
                style={styles.cancelBtnHalf}
              />
              <Button
                title="Confirm Cancel"
                variant="danger"
                onPress={handleConfirmCancel}
                loading={cancelling}
                style={styles.cancelBtnHalf}
              />
            </View>
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  alertWrapper: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
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
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  list: {
    gap: 12,
  },
  meetingCard: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleInfo: {
    flex: 1,
    marginRight: 8,
  },
  meetingTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  clientName: {
    fontSize: typography.sizes.xs,
    color: colors.primary,
    fontWeight: typography.weights.semibold,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 6,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
  locRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.bgApp,
    padding: 6,
    borderRadius: borderRadius.sm,
    marginBottom: 8,
  },
  locText: {
    fontSize: typography.sizes.xs,
    color: colors.text,
    flex: 1,
  },
  resultBox: {
    backgroundColor: colors.successBg,
    padding: 8,
    borderRadius: borderRadius.sm,
    marginBottom: 8,
  },
  resultLabel: {
    fontSize: typography.sizes.xs,
    color: colors.success,
  },
  boldText: {
    fontWeight: typography.weights.bold,
  },
  remarksText: {
    fontSize: typography.sizes.xs,
    color: colors.text,
    fontStyle: 'italic',
    marginTop: 2,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: 8,
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
  },
  emptySub: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyBtn: {
    marginTop: 8,
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
  modalBody: {
    padding: 20,
  },
  fieldHeading: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: 6,
  },
  pickerScroll: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  pickerItem: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgApp,
    marginRight: 8,
  },
  pickerItemActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  pickerText: {
    fontSize: typography.sizes.xs,
    color: colors.text,
  },
  pickerTextActive: {
    color: colors.white,
    fontWeight: typography.weights.bold,
  },
  timesRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timeInput: {
    flex: 1,
  },
  submitModalBtn: {
    marginTop: 16,
  },
  modalOverlayCenter: {
    flex: 1,
    backgroundColor: colors.backdrop,
    justifyContent: 'center',
    padding: 20,
  },
  cancelModalCard: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.lg,
    padding: 20,
    ...shadows.lg,
  },
  cancelTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.danger,
    marginBottom: 4,
  },
  cancelSub: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  cancelActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  cancelBtnHalf: {
    flex: 1,
  },
});
