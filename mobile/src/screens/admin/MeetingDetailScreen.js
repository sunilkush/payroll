import { useCallback, useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { QrCode, X } from 'lucide-react-native';
import { tokenStore } from '../../api/client';
import { closeFollowUpApi, getMeetingApi, getMeetingQrApi, meetingPhotoUrl } from '../../api/endpoints';
import { BottomSheet, Card, ErrorState, Header, ListRow, MapView, Notice, Pill, PrimaryButton, Screen, SecondaryButton, SkeletonList, StatusPill, Toast } from '../../components';
import { useMeetingGrace } from '../../hooks/useMeetingGrace';
import { colors, fonts, radius, sizes, spacing, text } from '../../theme';
import { formatDateWithYear, formatDayDate, formatTime } from '../../utils/format';
import { formatDistance } from '../../utils/geo';
import { meetingPill, OPEN_STATUSES } from '../../utils/meeting';
import { OUTCOMES } from '../../utils/visit';

const LOCATION_LABEL = {
  VERIFIED: 'Location verified',
  OUTSIDE_GEOFENCE: 'Outside the client radius',
  LOW_ACCURACY: 'Weak GPS',
  LOCATION_UNAVAILABLE: 'Location not available',
};
const outcomeLabel = (value) => OUTCOMES.find((item) => item.value === value)?.label ?? value;

// Proof trail: sirf server ke darj waqt.
function trailOf(meeting) {
  const steps = [];
  const events = meeting.events ?? [];
  const at = (type) => events.find((event) => event.type === type)?.at;
  steps.push({ title: 'Scheduled', time: meeting.createdAt, done: true });
  if (meeting.checkIn) {
    const verified = meeting.checkIn.locationStatus === 'VERIFIED';
    steps.push({
      title: LOCATION_LABEL[meeting.checkIn.locationStatus] ?? 'Location checked',
      detail: meeting.checkIn.distance != null ? `${formatDistance(meeting.checkIn.distance)} from client · GPS ±${Math.round(meeting.checkIn.accuracy ?? 0)} m` : undefined,
      time: meeting.checkIn.at,
      done: verified,
      warn: !verified,
    });
    steps.push({ title: 'Checked in · QR scanned', time: at('QR_SCANNED') ?? meeting.checkIn.at, done: true });
  }
  if (meeting.visitPhoto) steps.push({ title: 'Selfie uploaded', time: meeting.visitPhoto.uploadedAt, done: true });
  if (meeting.status === 'COMPLETED') steps.push({ title: `Completed · ${outcomeLabel(meeting.result?.outcome)}`, time: meeting.checkOut?.at, done: true });
  if (meeting.status === 'CANCELLED') steps.push({ title: 'Cancelled', detail: meeting.cancelReason || undefined, time: at('CANCELLED'), warn: true });
  const rejected = events.filter((event) => event.type === 'CHECK_IN_REJECTED');
  if (rejected.length) steps.push({ title: `${rejected.length} check-in attempt${rejected.length > 1 ? 's' : ''} rejected`, detail: rejected[rejected.length - 1].detail, time: rejected[rejected.length - 1].at, warn: true });
  return steps.sort((a, b) => new Date(a.time ?? 0) - new Date(b.time ?? 0));
}

// Admin: ek meeting ka saboot (map, proof trail, selfie, notes, follow-up) aur QR. route.params: { id, justCreated? }
export default function MeetingDetailScreen({ navigation, route }) {
  const { id, justCreated } = route.params;
  const insets = useSafeAreaInsets();
  const grace = useMeetingGrace();
  const [state, setState] = useState({ meeting: null, error: '' });
  const [qr, setQr] = useState(null);
  const [qrError, setQrError] = useState('');
  const [qrLoading, setQrLoading] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [followUpBusy, setFollowUpBusy] = useState('');
  const [followUpError, setFollowUpError] = useState('');
  const [toast, setToast] = useState(justCreated ? 'Visit scheduled. Show the QR to share it.' : '');
  const hideToast = useCallback(() => setToast(''), []);

  const load = useCallback(async () => {
    try {
      const res = await getMeetingApi(id);
      setState({ meeting: res.data.meeting, error: '' });
    } catch (err) {
      setState((previous) => ({ ...previous, error: err.message }));
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const showQr = async () => {
    setQrLoading(true);
    setQrError('');
    try {
      const res = await getMeetingQrApi(id);
      setQr(res.data);
    } catch (err) {
      setQrError(err.message);
    } finally {
      setQrLoading(false);
    }
  };

  const closeFollowUp = async (status) => {
    setFollowUpBusy(status);
    setFollowUpError('');
    try {
      await closeFollowUpApi(id, status);
      setFollowUpOpen(false);
      setToast(status === 'DONE' ? 'Follow-up marked done.' : 'Follow-up cancelled.');
      load();
    } catch (err) {
      setFollowUpError(err.message);
    } finally {
      setFollowUpBusy('');
    }
  };

  const { meeting } = state;
  if (!meeting) {
    return (
      <Screen>
        <Header title="Visit" onBack={navigation.goBack} />
        {state.error ? (
          <Card>
            <ErrorState message={state.error} onRetry={load} />
          </Card>
        ) : (
          <SkeletonList rows={3} />
        )}
      </Screen>
    );
  }

  const pill = meetingPill(meeting, grace);
  const place = meeting.location;
  const point = meeting.checkIn?.lat != null ? { lat: meeting.checkIn.lat, lng: meeting.checkIn.lng } : null;
  const away = meeting.checkIn && meeting.checkIn.locationStatus !== 'VERIFIED';
  const trail = trailOf(meeting);
  const open = OPEN_STATUSES.includes(meeting.status);
  const followUp = meeting.followUp;
  const photoSource = meeting.visitPhoto ? { uri: meetingPhotoUrl(id), headers: { Authorization: `Bearer ${tokenStore.get()}` } } : null;

  return (
    <Screen overlay={<Toast message={toast} onHide={hideToast} />}>
      <Header
        title={meeting.clientId?.name ?? meeting.title}
        subtitle={`${meeting.salesManagerId?.name ?? ''} · ${formatDayDate(meeting.date)} · ${formatTime(meeting.startAt)}–${formatTime(meeting.endAt)}`}
        onBack={navigation.goBack}
      />
      <View style={styles.row}>
        <Pill variant={pill.variant}>{pill.label}</Pill>
        <Text style={text.small}>{meeting.title}</Text>
      </View>

      {place?.lat != null && (
        <MapView
          height={220}
          center={{ lat: place.lat, lng: place.lng }}
          zoom={17}
          fit={Boolean(point)}
          markers={[{ lat: place.lat, lng: place.lng, label: place.name }]}
          circles={[{ lat: place.lat, lng: place.lng, radius: place.radius, tone: 'success', dashed: true }]}
          user={point ? { ...point, tone: away ? 'danger' : undefined } : undefined}
          lines={
            point && meeting.checkIn.distance != null
              ? [{ from: point, to: place, tone: away ? 'danger' : 'success', dashed: true, label: formatDistance(meeting.checkIn.distance) }]
              : undefined
          }
        />
      )}

      <View style={styles.group}>
        <Text style={styles.sectionTitle}>Proof trail</Text>
        <Card>
          {trail.map((step, index) => (
            <View key={`${step.title}-${index}`} style={styles.step}>
              <View style={styles.rail}>
                <View style={[styles.dot, step.done && styles.dotDone, step.warn && styles.dotWarn]} />
                {index < trail.length - 1 && <View style={styles.line} />}
              </View>
              <View style={styles.stepText}>
                <View style={styles.stepTop}>
                  <Text style={[text.bodyMedium, styles.flex]}>{step.title}</Text>
                  <Text style={styles.mono}>{step.time ? formatTime(step.time) : '--:--'}</Text>
                </View>
                {step.detail ? <Text style={text.small}>{step.detail}</Text> : null}
              </View>
            </View>
          ))}
          {!meeting.checkIn && open && <Text style={text.small}>Waiting for check-in. Times are recorded by the server.</Text>}
        </Card>
      </View>

      {(photoSource || meeting.result) && (
        <Card>
          {photoSource && (
            <Pressable onPress={() => setPhotoOpen(true)} accessibilityRole="imagebutton" accessibilityLabel="Selfie at client site, tap to enlarge">
              <Image source={photoSource} style={styles.thumb} />
            </Pressable>
          )}
          {meeting.result?.remarks ? <Text style={text.body}>{meeting.result.remarks}</Text> : null}
          {meeting.result?.outcome ? <Text style={text.small}>Outcome: {outcomeLabel(meeting.result.outcome)}</Text> : null}
        </Card>
      )}

      {followUp?.at && (
        <Card padded={false}>
          <ListRow title="Follow-up" subtitle={followUp.notes || undefined} value={`${formatDateWithYear(followUp.at)} · ${formatTime(followUp.at)}`} right={<StatusPill status={followUp.status} />} divider={false} />
        </Card>
      )}

      <Notice variant="danger">{qrError}</Notice>
      {open && <PrimaryButton title="Show QR" icon={QrCode} onPress={showQr} loading={qrLoading} />}
      {followUp?.status === 'PENDING' && <SecondaryButton title="Edit follow-up" onPress={() => setFollowUpOpen(true)} />}

      {/* QR poori screen par, client ko dikhane / screenshot karke bhejne ke liye */}
      <Modal visible={Boolean(qr)} animationType="fade" onRequestClose={() => setQr(null)}>
        <View style={[styles.qrScreen, { paddingTop: insets.top + spacing.gap, paddingBottom: insets.bottom + spacing.gapLg }]}>
          <Pressable style={styles.close} onPress={() => setQr(null)} accessibilityRole="button" accessibilityLabel="Close QR">
            <X size={22} strokeWidth={2} color={colors.ink} />
          </Pressable>
          <Text style={text.screenTitle}>{meeting.clientId?.name}</Text>
          <Text style={text.small}>
            For {meeting.salesManagerId?.name} · {formatDayDate(meeting.date)} {formatTime(meeting.startAt)}–{formatTime(meeting.endAt)}
          </Text>
          <View style={styles.qrBox}>{qr && <QRCode value={qr.token} size={260} color={colors.ink} backgroundColor={colors.card} />}</View>
          <Text style={[text.small, styles.center]}>
            {qr?.expired ? 'This QR has expired.' : `Valid until ${qr ? formatTime(qr.expiresAt) : ''} on ${formatDayDate(meeting.date)}.`} Show it at the client site, or
            take a screenshot and send it.
          </Text>
        </View>
      </Modal>

      <Modal visible={photoOpen} transparent animationType="fade" onRequestClose={() => setPhotoOpen(false)}>
        <Pressable style={styles.photoScreen} onPress={() => setPhotoOpen(false)} accessibilityRole="button" accessibilityLabel="Close photo">
          {photoSource && <Image source={photoSource} style={styles.photoFull} resizeMode="contain" />}
        </Pressable>
      </Modal>

      <BottomSheet visible={followUpOpen} onClose={() => setFollowUpOpen(false)} title="Follow-up">
        <Text style={text.body}>
          Due {followUp?.at ? `${formatDateWithYear(followUp.at)} at ${formatTime(followUp.at)}` : ''}. Close it once it is done; to change the date,
          schedule a new visit.
        </Text>
        <Notice variant="danger">{followUpError}</Notice>
        <PrimaryButton title="Mark as done" onPress={() => closeFollowUp('DONE')} loading={followUpBusy === 'DONE'} disabled={Boolean(followUpBusy)} />
        <SecondaryButton title="Cancel follow-up" danger onPress={() => closeFollowUp('CANCELLED')} loading={followUpBusy === 'CANCELLED'} disabled={Boolean(followUpBusy)} />
        <SecondaryButton
          title="Schedule a new visit"
          onPress={() => {
            setFollowUpOpen(false);
            navigation.navigate('ScheduleMeeting', { client: meeting.clientId });
          }}
        />
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.gap, flexWrap: 'wrap' },
  group: { gap: 8 },
  sectionTitle: { ...text.label, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 12 },
  step: { flexDirection: 'row', gap: spacing.gap },
  rail: { width: 14, alignItems: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: colors.inputBorder, backgroundColor: colors.card, marginTop: 5 },
  dotDone: { borderColor: colors.success, backgroundColor: colors.success },
  dotWarn: { borderColor: colors.warning, backgroundColor: colors.warningTint },
  line: { flex: 1, width: 2, backgroundColor: colors.line, marginVertical: 2 },
  stepText: { flex: 1, paddingBottom: spacing.gap, gap: 2 },
  stepTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.gap },
  mono: { fontFamily: fonts.mono, fontSize: 14, color: colors.ink },
  thumb: { width: 96, height: 128, borderRadius: radius.input, backgroundColor: colors.divider },
  qrScreen: { flex: 1, backgroundColor: colors.paper, alignItems: 'center', paddingHorizontal: spacing.screen, gap: spacing.gap },
  close: {
    alignSelf: 'flex-end',
    width: sizes.touch,
    height: sizes.touch,
    borderRadius: sizes.touch / 2,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrBox: { marginTop: spacing.screen, padding: spacing.screen, backgroundColor: colors.card, borderRadius: radius.hero, borderWidth: 1, borderColor: colors.line },
  center: { textAlign: 'center' },
  photoScreen: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  photoFull: { width: '100%', height: '80%' },
});
