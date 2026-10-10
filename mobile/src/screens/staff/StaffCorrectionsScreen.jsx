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
  cancelCorrectionApi,
  listCorrectionsApi,
  requestCorrectionApi,
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
import { toFieldErrors } from '../../utils/formErrors.js';
import { formatDate, formatTime, todayLocal } from '../../utils/format.js';

const EMPTY_FORM = { date: todayLocal(), punchIn: '09:30', punchOut: '18:30', reason: '' };

export default function StaffCorrectionsScreen({ navigation, route }) {
  const presetDate = route?.params?.date || todayLocal();

  const [corrections, setCorrections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionMsg, setActionMsg] = useState({ type: 'success', text: '' });

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM, date: presetDate });
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchCorrections = useCallback(async () => {
    try {
      const res = await listCorrectionsApi();
      setCorrections(res?.data?.items || []);
    } catch (err) {
      setActionMsg({ type: 'error', text: err.message || 'Failed to load correction requests.' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCorrections();
  }, [fetchCorrections]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCorrections();
  };

  const openForm = () => {
    setForm({ ...EMPTY_FORM, date: presetDate });
    setFieldErrors({});
    setFormError('');
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    if (!form.reason.trim()) {
      setFormError('Please provide a reason for the punch correction.');
      return;
    }

    setSubmitting(true);
    setFormError('');
    setFieldErrors({});

    try {
      await requestCorrectionApi({
        date: form.date,
        punchIn: form.punchIn || undefined,
        punchOut: form.punchOut || undefined,
        reason: form.reason.trim(),
      });
      setModalVisible(false);
      setActionMsg({
        type: 'success',
        text: 'Correction request submitted. It will update upon admin approval.',
      });
      fetchCorrections();
      setTimeout(() => setActionMsg({ type: 'success', text: '' }), 4000);
    } catch (err) {
      const fieldMap = toFieldErrors(err);
      setFieldErrors(fieldMap);
      setFormError(Object.keys(fieldMap).length ? '' : err.message || 'Failed to send request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = (correction) => {
    NativeAlert.alert(
      'Cancel Correction Request',
      `Cancel your request for ${formatDate(correction.date)}?`,
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Cancel Request',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelCorrectionApi(correction._id);
              setActionMsg({ type: 'success', text: 'Correction request cancelled.' });
              fetchCorrections();
              setTimeout(() => setActionMsg({ type: 'success', text: '' }), 3000);
            } catch (err) {
              setActionMsg({ type: 'error', text: err.message });
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

  return (
    <ScreenWrapper contentContainerStyle={styles.container} scrollable>
      <Header
        title="Punch Corrections"
        onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
        rightIcon="plus-circle"
        onRightPress={openForm}
      />

      {actionMsg.text ? <Alert type={actionMsg.type}>{actionMsg.text}</Alert> : null}

      <Text style={styles.subtitle}>
        Forgot to punch or had a GPS issue? Request a punch correction for your admin to approve.
      </Text>

      <Button
        title="Request Punch Correction"
        onPress={openForm}
        icon="clock-edit-outline"
        style={styles.addBtn}
      />

      <Text style={styles.sectionTitle}>Request History</Text>

      {loading ? (
        <Loader message="Loading correction requests..." />
      ) : corrections.length === 0 ? (
        <Card style={styles.emptyCard}>
          <MaterialCommunityIcons name="timer-sand-empty" size={44} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No correction requests</Text>
          <Text style={styles.emptySub}>You have no pending or past punch corrections.</Text>
        </Card>
      ) : (
        <View style={styles.list}>
          {corrections.map((item) => (
            <Card key={item._id} style={styles.itemCard} elevation="sm">
              <View style={styles.itemHeader}>
                <View>
                  <Text style={styles.itemDate}>{formatDate(item.date)}</Text>
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

              {item.adminNote ? (
                <Text style={styles.adminNoteText}>
                  Admin Note: {item.adminNote}
                </Text>
              ) : null}

              {item.status === 'PENDING' && (
                <TouchableOpacity
                  onPress={() => handleCancel(item)}
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

      {/* Request Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCard} elevation="lg">
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Request Punch Fix</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {formError ? <Alert type="error">{formError}</Alert> : null}

              <Input
                label="Date (YYYY-MM-DD) *"
                value={form.date}
                onChangeText={(t) => setForm((p) => ({ ...p, date: t }))}
                placeholder="YYYY-MM-DD"
                prefixIcon="calendar"
                error={fieldErrors.date}
              />

              <View style={styles.timesRow}>
                <Input
                  label="Punch In (HH:mm)"
                  value={form.punchIn}
                  onChangeText={(t) => setForm((p) => ({ ...p, punchIn: t }))}
                  placeholder="09:30"
                  prefixIcon="login"
                  containerStyle={styles.half}
                />
                <Input
                  label="Punch Out (HH:mm)"
                  value={form.punchOut}
                  onChangeText={(t) => setForm((p) => ({ ...p, punchOut: t }))}
                  placeholder="18:30"
                  prefixIcon="logout"
                  containerStyle={styles.half}
                />
              </View>

              <Input
                label="Reason for Correction *"
                value={form.reason}
                onChangeText={(t) => setForm((p) => ({ ...p, reason: t }))}
                placeholder="e.g. Forgot phone at home / device GPS malfunction"
                multiline
                numberOfLines={3}
                error={fieldErrors.reason}
              />

              <Button
                title="Submit Correction Request"
                onPress={handleSubmit}
                loading={submitting}
                style={styles.modalSubmitBtn}
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
    paddingBottom: 32,
  },
  subtitle: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 18,
  },
  addBtn: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: 12,
  },
  list: {
    gap: 12,
  },
  itemCard: {
    padding: 16,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  itemDate: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
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
  adminNoteText: {
    fontSize: typography.sizes.xs,
    color: colors.info,
    marginTop: 4,
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
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  timesRow: {
    flexDirection: 'row',
    gap: 10,
  },
  half: {
    flex: 1,
  },
  modalSubmitBtn: {
    marginTop: 14,
    marginBottom: 16,
  },
});
