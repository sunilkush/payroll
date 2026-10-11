import { useCallback, useEffect, useState } from 'react';
import {
  Alert as NativeAlert,
  Linking,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import {
  checkOutMeetingApi,
  getMeetingQrApi,
  listMeetingsApi,
} from '../../api/meetingApi.js';
import Alert from '../../components/common/Alert.jsx';
import Badge from '../../components/common/Badge.jsx';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import Header from '../../components/common/Header.jsx';
import Input from '../../components/common/Input.jsx';
import Loader from '../../components/common/Loader.jsx';
import ScreenWrapper from '../../components/common/ScreenWrapper.jsx';
import { borderRadius, colors, radius, shadows, spacing, typography } from '../../theme/index.js';
import { formatDate, formatTime, todayLocal } from '../../utils/format.js';
import { haversineDistanceMeters } from '../../utils/geo.js';

const OUTCOME_OPTIONS = [
  { key: 'POSITIVE', label: 'Positive / Interested', color: colors.success },
  { key: 'FOLLOW_UP', label: 'Needs Follow-up', color: colors.warning },
  { key: 'NEUTRAL', label: 'Neutral / Reviewing', color: colors.primary },
  { key: 'NEGATIVE', label: 'Not Interested', color: colors.error },
];

export default function StaffMeetingsScreen({ navigation }) {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'SCHEDULED' | 'CHECKED_IN' | 'COMPLETED'
  const [feedback, setFeedback] = useState({ type: 'success', text: '' });
  const [coords, setCoords] = useState(null);

  // Check-Out Modal State
  const [checkoutModalVisible, setCheckoutModalVisible] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [outcome, setOutcome] = useState('POSITIVE');
  const [dealValue, setDealValue] = useState('');
  const [remarks, setRemarks] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [submittingCheckout, setSubmittingCheckout] = useState(false);

  // QR Modal State
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [loadingQr, setLoadingQr] = useState(false);

  const fetchMeetings = useCallback(async () => {
    try {
      setFeedback({ type: 'success', text: '' });
      const res = await listMeetingsApi();
      setMeetings(res?.data?.items || res?.data || []);
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to load client meetings.' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const getPosition = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      }
    } catch {
      // Non-critical, ignore
    }
  };

  useEffect(() => {
    fetchMeetings();
    getPosition();
  }, [fetchMeetings]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMeetings();
    getPosition();
  };

  const handleCallClient = (phone) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`);
  };

  const handleOpenQr = async (meeting) => {
    setSelectedMeeting(meeting);
    setLoadingQr(true);
    setQrModalVisible(true);
    try {
      const res = await getMeetingQrApi(meeting._id);
      setQrData(res?.data?.qr || null);
    } catch (err) {
      NativeAlert.alert('QR Error', err.message || 'Unable to retrieve visit QR code.');
    } finally {
      setLoadingQr(false);
    }
  };

  const handleOpenCheckOut = (meeting) => {
    setSelectedMeeting(meeting);
    setOutcome('POSITIVE');
    setDealValue('');
    setRemarks('');
    setFollowUpDate('');
    setCheckoutModalVisible(true);
  };

  const handleSubmitCheckOut = async () => {
    if (!selectedMeeting) return;
    setSubmittingCheckout(true);
    try {
      const payload = {
        outcome,
        remarks: remarks.trim(),
        estimatedDealValue: dealValue ? Number(dealValue) : undefined,
        followUpDate: followUpDate.trim() || undefined,
        lat: coords?.lat,
        lng: coords?.lng,
      };

      await checkOutMeetingApi(selectedMeeting._id, payload);
      setCheckoutModalVisible(false);
      setFeedback({
        type: 'success',
        text: `Check-out recorded for "${selectedMeeting.title}". Meeting marked completed!`,
      });
      fetchMeetings();
      setTimeout(() => setFeedback({ type: 'success', text: '' }), 4000);
    } catch (err) {
      NativeAlert.alert('Check-out Error', err.message || 'Failed to complete visit.');
    } finally {
      setSubmittingCheckout(false);
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
        title="Client Visits"
        subtitle="Assigned field sales & meetings"
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

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {['ALL', 'SCHEDULED', 'CHECKED_IN', 'COMPLETED'].map((opt) => {
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
          <Loader message="Loading assigned visits..." />
        ) : filteredMeetings.length === 0 ? (
          <EmptyState
            icon="briefcase-clock-outline"
            title="No Client Visits Found"
            description={
              statusFilter !== 'ALL'
                ? `No visits matching the ${statusFilter} filter.`
                : 'You have no sales meetings scheduled for this period.'
            }
          />
        ) : (
          <View style={styles.list}>
            {filteredMeetings.map((meeting) => {
              const badge = getStatusBadge(meeting.status);
              const client = meeting.clientId || {};
              const phone = meeting.contactPhone || client.phone;
              const contact = meeting.contactPerson || client.contactPerson;

              let distanceText = null;
              if (coords && meeting.location?.lat != null && meeting.location?.lng != null) {
                const dist = Math.round(
                  haversineDistanceMeters(
                    coords.lat,
                    coords.lng,
                    meeting.location.lat,
                    meeting.location.lng
                  )
                );
                distanceText = dist < 1000 ? `${dist}m away` : `${(dist / 1000).toFixed(1)}km away`;
              }

              return (
                <Card key={meeting._id} style={styles.meetingCard} elevation="sm">
                  {/* Card Header */}
                  <View style={styles.cardHeader}>
                    <View style={styles.titleInfo}>
                      <Text style={styles.meetingTitle}>{meeting.title}</Text>
                      <Text style={styles.clientName}>{client.name || 'Client'}</Text>
                    </View>
                    <Badge label={badge.label} variant={badge.variant} size="sm" />
                  </View>

                  {/* Date & Time */}
                  <View style={styles.dateTimeRow}>
                    <View style={styles.timeItem}>
                      <MaterialCommunityIcons name="calendar" size={16} color={colors.primary} />
                      <Text style={styles.timeText}>{formatDate(meeting.date)}</Text>
                    </View>
                    <View style={styles.timeItem}>
                      <MaterialCommunityIcons name="clock-outline" size={16} color={colors.primary} />
                      <Text style={styles.timeText}>
                        {formatTime(meeting.startAt)} - {formatTime(meeting.endAt)}
                      </Text>
                    </View>
                  </View>

                  {/* Location & Distance */}
                  {meeting.location?.address ? (
                    <View style={styles.locRow}>
                      <MaterialCommunityIcons name="map-marker" size={16} color={colors.danger} />
                      <Text style={styles.locText} numberOfLines={2}>
                        {meeting.location.address}
                      </Text>
                      {distanceText && (
                        <Text style={styles.distBadge}>({distanceText})</Text>
                      )}
                    </View>
                  ) : null}

                  {/* Contact Person & Call Action */}
                  {contact || phone ? (
                    <View style={styles.contactRow}>
                      <View style={styles.contactInfo}>
                        <MaterialCommunityIcons name="account-tie" size={16} color={colors.textSecondary} />
                        <Text style={styles.contactText}>
                          {contact || 'Contact'} {phone ? `• ${phone}` : ''}
                        </Text>
                      </View>
                      {phone && (
                        <TouchableOpacity
                          style={styles.callBtn}
                          onPress={() => handleCallClient(phone)}
                        >
                          <MaterialCommunityIcons name="phone" size={16} color={colors.primary} />
                          <Text style={styles.callText}>Call</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ) : null}

                  {/* Check-In / Check-Out Actions */}
                  <View style={styles.actionsRow}>
                    {meeting.status === 'SCHEDULED' && (
                      <Button
                        title="Show Visit QR Code"
                        variant="outline"
                        size="sm"
                        icon="qrcode-scan"
                        onPress={() => handleOpenQr(meeting)}
                        style={styles.fullActionBtn}
                      />
                    )}

                    {meeting.status === 'CHECKED_IN' && (
                      <Button
                        title="Complete & Check-Out"
                        variant="success"
                        size="sm"
                        icon="check-all"
                        onPress={() => handleOpenCheckOut(meeting)}
                        style={styles.fullActionBtn}
                      />
                    )}

                    {meeting.status === 'COMPLETED' && meeting.result?.outcome && (
                      <View style={styles.resultBanner}>
                        <MaterialCommunityIcons name="check-circle" size={16} color={colors.success} />
                        <Text style={styles.resultText}>
                          Outcome: {meeting.result.outcome}
                          {meeting.result.estimatedDealValue
                            ? ` (Est: ₹${meeting.result.estimatedDealValue.toLocaleString('en-IN')})`
                            : ''}
                        </Text>
                      </View>
                    )}
                  </View>
                </Card>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* QR Code Modal */}
      <Modal
        visible={qrModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setQrModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.qrModalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Visit QR Code</Text>
              <TouchableOpacity onPress={() => setQrModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {loadingQr ? (
              <Loader message="Fetching verification token..." />
            ) : (
              <View style={styles.qrContent}>
                <View style={styles.qrIconFrame}>
                  <MaterialCommunityIcons name="qrcode" size={140} color={colors.primary} />
                </View>
                <Text style={styles.qrHint}>
                  Show this QR code at the client premises or scan it to confirm check-in.
                </Text>
                {qrData?.token ? (
                  <View style={styles.tokenBox}>
                    <Text style={styles.tokenLabel}>Token Code:</Text>
                    <Text style={styles.tokenCode}>{qrData.token.slice(0, 8)}...</Text>
                  </View>
                ) : null}
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Check-Out / Visit Completion Modal */}
      <Modal
        visible={checkoutModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setCheckoutModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.checkoutModalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Visit Summary</Text>
                <Text style={styles.modalSubtitle}>{selectedMeeting?.title}</Text>
              </View>
              <TouchableOpacity onPress={() => setCheckoutModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.checkoutBody}>
              <Text style={styles.fieldLabel}>Meeting Outcome *</Text>
              <View style={styles.outcomesGrid}>
                {OUTCOME_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.key}
                    style={[
                      styles.outcomeCard,
                      outcome === opt.key && {
                        borderColor: opt.color,
                        backgroundColor: `${opt.color}15`,
                      },
                    ]}
                    onPress={() => setOutcome(opt.key)}
                  >
                    <MaterialCommunityIcons
                      name={
                        opt.key === 'POSITIVE'
                          ? 'thumb-up'
                          : opt.key === 'NEGATIVE'
                          ? 'thumb-down'
                          : opt.key === 'FOLLOW_UP'
                          ? 'calendar-sync'
                          : 'comment-question'
                      }
                      size={20}
                      color={opt.color}
                    />
                    <Text
                      style={[
                        styles.outcomeText,
                        outcome === opt.key && { color: opt.color, fontWeight: 'bold' },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Input
                label="Estimated Deal Value (₹ Optional)"
                placeholder="e.g. 50000"
                keyboardType="numeric"
                value={dealValue}
                onChangeText={setDealValue}
              />

              <Input
                label="Meeting Notes & Client Feedback *"
                placeholder="Key discussion points, requirements discussed..."
                multiline
                numberOfLines={3}
                value={remarks}
                onChangeText={setRemarks}
              />

              <Input
                label="Next Follow-up Date (Optional)"
                placeholder="YYYY-MM-DD (e.g. 2026-10-25)"
                value={followUpDate}
                onChangeText={setFollowUpDate}
              />

              <Button
                title="Complete & Check-Out"
                variant="success"
                icon="check-decagram"
                onPress={handleSubmitCheckOut}
                loading={submittingCheckout}
                style={styles.completeBtn}
              />
            </ScrollView>
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
    marginBottom: 10,
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
  dateTimeRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  timeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
  locRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.bgApp,
    padding: 8,
    borderRadius: borderRadius.sm,
    marginBottom: 8,
  },
  locText: {
    fontSize: typography.sizes.xs,
    color: colors.text,
    flex: 1,
  },
  distBadge: {
    fontSize: typography.sizes.xs,
    color: colors.info,
    fontWeight: typography.weights.medium,
  },
  contactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  contactText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#eff6ff',
    borderRadius: borderRadius.sm,
  },
  callText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  actionsRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  fullActionBtn: {
    width: '100%',
  },
  resultBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.successBg,
    padding: 8,
    borderRadius: borderRadius.sm,
  },
  resultText: {
    fontSize: typography.sizes.xs,
    color: colors.success,
    fontWeight: typography.weights.medium,
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
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.backdrop,
    justifyContent: 'flex-end',
  },
  qrModalCard: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: 20,
    alignItems: 'center',
    ...shadows.lg,
  },
  modalHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  modalSubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
  },
  qrContent: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  qrIconFrame: {
    padding: 16,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
    ...shadows.md,
  },
  qrHint: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
  },
  tokenBox: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: colors.background,
    padding: 8,
    borderRadius: radius.control,
  },
  tokenLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
  },
  tokenCode: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  checkoutModalCard: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.modal,
    borderTopRightRadius: radius.modal,
    maxHeight: '90%',
    padding: spacing.xl,
    ...shadows.lg,
  },
  checkoutBody: {
    paddingBottom: 20,
  },
  fieldLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: 8,
  },
  outcomesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  outcomeCard: {
    width: '48%',
    padding: 10,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.background,
  },
  outcomeText: {
    fontSize: typography.sizes.xs,
    color: colors.text,
    textAlign: 'center',
  },
  completeBtn: {
    marginTop: 12,
  },
});
