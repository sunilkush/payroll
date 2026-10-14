import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { cancelCorrectionApi, getMonthlyAttendanceApi, listCorrectionsApi, requestCorrectionApi } from '../../api/endpoints';
import {
  BottomSheet,
  Card,
  EmptyState,
  FormField,
  Header,
  ListRow,
  Notice,
  Pill,
  PickerField,
  PrimaryButton,
  Screen,
  SecondaryButton,
  SegmentedControl,
  SkeletonList,
  StatusPill,
  Toast,
} from '../../components';
import { colors, spacing, text } from '../../theme';
import { formatDateWithYear, formatDayDate, formatTime, todayStr } from '../../utils/format';

const MODES = [
  { value: 'in', label: 'In time' },
  { value: 'out', label: 'Out time' },
  { value: 'both', label: 'Both' },
];

// Us din attendance mein kya darj hai: { punchIn, punchOut } (ISO ya null), ya null jab abhi pata nahi.
function useRecorded(date) {
  const [recorded, setRecorded] = useState(null);
  useEffect(() => {
    let ignore = false;
    setRecorded(null);
    getMonthlyAttendanceApi(date.slice(0, 7))
      .then(({ data }) => {
        const day = data.days.find((item) => item.date === date);
        if (!ignore) setRecorded({ punchIn: day?.punchIn?.time ?? null, punchOut: day?.punchOut?.time ?? null, status: day?.status });
      })
      .catch(() => !ignore && setRecorded({ unknown: true }));
    return () => {
      ignore = true;
    };
  }, [date]);
  return recorded;
}

// Jo punch nahi hai wahi mode pehle se chuna: out chhoota to "Out time", kuch nahi to "Both".
const suggestedMode = (recorded) => {
  if (!recorded || recorded.unknown) return 'both';
  if (!recorded.punchIn) return 'both';
  return recorded.punchOut ? 'in' : 'out';
};

function RequestsCard({ items, loading, onOpen }) {
  return (
    <Card padded={false}>
      <View style={styles.cardHead}>
        <Text style={text.heading}>My requests</Text>
      </View>
      {loading && !items ? (
        <View style={styles.cardBody}>
          <SkeletonList rows={2} />
        </View>
      ) : !items?.length ? (
        <EmptyState title="No requests yet" message="Requests you send appear here with their status." />
      ) : (
        items.map((item, index) => (
          <ListRow
            key={item._id}
            title={formatDayDate(item.date)}
            subtitle={`${item.punchIn ? `In ${formatTime(item.punchIn)}` : ''}${item.punchIn && item.punchOut ? ' · ' : ''}${
              item.punchOut ? `Out ${formatTime(item.punchOut)}` : ''
            }`}
            right={<StatusPill status={item.status} />}
            onPress={() => onOpen(item)}
            divider={index < items.length - 1}
          />
        ))
      )}
    </Card>
  );
}

// Staff: chhoota / galat punch theek karwane ki request (POST /punch-corrections). Admin manzoor kare tabhi attendance badalti hai.
// route.params.date: Attendance screen se chuna hua din.
export default function PunchCorrectionScreen({ navigation, route }) {
  const [date, setDate] = useState(route.params?.date ?? todayStr());
  const recorded = useRecorded(date);
  const [mode, setMode] = useState('both');
  const [modeTouched, setModeTouched] = useState(false);
  const [times, setTimes] = useState({ punchIn: '', punchOut: '' });
  const [reason, setReason] = useState('');
  const [fields, setFields] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [requests, setRequests] = useState({ items: null, loading: true });
  const [open, setOpen] = useState(null); // BottomSheet mein khuli request
  const [cancelling, setCancelling] = useState(false);

  // Stable rahe, warna har render par Toast ka timer dobara shuru hota.
  const hideToast = useCallback(() => setToast(''), []);

  const loadRequests = useCallback(async () => {
    setRequests((previous) => ({ ...previous, loading: true }));
    try {
      const res = await listCorrectionsApi({ limit: 20 });
      setRequests({ items: res.data.items, loading: false });
    } catch {
      setRequests((previous) => ({ items: previous.items ?? [], loading: false }));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRequests();
    }, [loadRequests])
  );

  // Din badalne par (jab tak user ne khud na chuna ho) jo chhoota hai wahi mode.
  useEffect(() => {
    if (!modeTouched && recorded) setMode(suggestedMode(recorded));
  }, [recorded, modeTouched]);

  const wantsIn = mode !== 'out';
  const wantsOut = mode !== 'in';
  const outMissing = Boolean(recorded?.punchIn && !recorded.punchOut && date !== todayStr());
  const inMissing = Boolean(recorded && !recorded.unknown && !recorded.punchIn);

  const setTime = (key) => (value) => {
    setTimes((previous) => ({ ...previous, [key]: value }));
    setFields((previous) => ({ ...previous, [key]: undefined }));
  };

  const submit = async () => {
    const problems = {};
    if (wantsIn && !times.punchIn) problems.punchIn = 'Choose the punch in time.';
    if (wantsOut && !times.punchOut) problems.punchOut = 'Choose the punch out time.';
    if (reason.trim().length < 3) problems.reason = 'Tell your admin what happened (at least 3 characters).';
    setFields(problems);
    if (Object.keys(problems).length) return;

    setBusy(true);
    setError('');
    try {
      await requestCorrectionApi({
        date,
        ...(wantsIn && { punchIn: times.punchIn }),
        ...(wantsOut && { punchOut: times.punchOut }),
        reason: reason.trim(),
      });
      setTimes({ punchIn: '', punchOut: '' });
      setReason('');
      setToast('Request sent to your admin.');
      loadRequests();
    } catch (err) {
      setFields(err.fields);
      // Field ke bina wale (jaise "future date", "payroll finalized", "already pending") upar.
      const known = ['date', 'punchIn', 'punchOut', 'reason'];
      if (!Object.keys(err.fields).some((key) => known.includes(key))) setError(err.fields[''] ?? err.message);
    } finally {
      setBusy(false);
    }
  };

  const cancelRequest = async () => {
    setCancelling(true);
    try {
      await cancelCorrectionApi(open._id);
      setOpen(null);
      setToast('Request cancelled.');
      loadRequests();
    } catch (err) {
      setOpen((previous) => ({ ...previous, cancelError: err.message }));
    } finally {
      setCancelling(false);
    }
  };

  return (
    <Screen overlay={<Toast message={toast} onHide={hideToast} />}>
      <Header title="Fix a missed punch" onBack={navigation.goBack} />
      <Notice variant="danger">{error}</Notice>

      <Card>
        <PickerField
          label="Date"
          mode="date"
          value={date}
          max={todayStr()}
          onChange={(value) => {
            setDate(value);
            setModeTouched(false);
            setFields((previous) => ({ ...previous, date: undefined }));
          }}
          error={fields.date}
          disabled={busy}
        />
        <View style={styles.recorded}>
          <Text style={text.small}>
            Recorded:{' '}
            {recorded && !recorded.unknown ? (
              <Text style={styles.recordedMono}>
                In {recorded.punchIn ? formatTime(recorded.punchIn) : '—'} · Out {recorded.punchOut ? formatTime(recorded.punchOut) : '—'}
              </Text>
            ) : (
              <Text style={styles.recordedMono}>{recorded?.unknown ? 'Could not load' : '…'}</Text>
            )}
          </Text>
          {outMissing && <Pill variant="warning">Out missing</Pill>}
          {inMissing && <Pill variant="warning">No punch</Pill>}
        </View>
      </Card>

      <SegmentedControl
        options={MODES}
        value={mode}
        onChange={(value) => {
          setMode(value);
          setModeTouched(true);
        }}
      />

      <View style={styles.times}>
        {wantsIn && (
          <PickerField label="In time" mode="time" value={times.punchIn} onChange={setTime('punchIn')} error={fields.punchIn} disabled={busy} />
        )}
        {wantsOut && (
          <PickerField label="Out time" mode="time" value={times.punchOut} onChange={setTime('punchOut')} error={fields.punchOut} disabled={busy} />
        )}
      </View>

      <FormField
        label="Reason (required)"
        value={reason}
        onChangeText={(value) => {
          setReason(value);
          setFields((previous) => ({ ...previous, reason: undefined }));
        }}
        error={fields.reason}
        placeholder="For example: phone battery died before I could punch out"
        multiline
        maxLength={500}
        editable={!busy}
      />

      <Text style={text.small}>
        Your admin reviews this request. Your attendance changes only after it is approved, and you will see the result below.
      </Text>

      <PrimaryButton title="Submit request" onPress={submit} loading={busy} />

      <RequestsCard items={requests.items} loading={requests.loading} onOpen={setOpen} />

      <BottomSheet visible={Boolean(open)} onClose={() => setOpen(null)} title={open ? formatDateWithYear(open.date) : ''}>
        {open && (
          <>
            <View style={styles.sheetRow}>
              <StatusPill status={open.status} />
            </View>
            <Card padded={false}>
              <ListRow
                title="Asked for"
                value={[open.punchIn && `In ${formatTime(open.punchIn)}`, open.punchOut && `Out ${formatTime(open.punchOut)}`].filter(Boolean).join(' · ')}
              />
              <ListRow
                title="Recorded then"
                value={`In ${open.recorded?.punchIn ? formatTime(open.recorded.punchIn) : '—'} · Out ${
                  open.recorded?.punchOut ? formatTime(open.recorded.punchOut) : '—'
                }`}
                divider={false}
              />
            </Card>
            <Text style={text.body}>{open.reason}</Text>
            {open.actionNote ? <Notice variant={open.status === 'REJECTED' ? 'danger' : 'info'}>Admin: {open.actionNote}</Notice> : null}
            <Notice variant="danger">{open.cancelError}</Notice>
            {open.status === 'PENDING' && <SecondaryButton title="Cancel request" danger onPress={cancelRequest} loading={cancelling} />}
          </>
        )}
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  recorded: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.gap, flexWrap: 'wrap' },
  recordedMono: { fontFamily: text.mono.fontFamily, color: colors.ink },
  times: { flexDirection: 'row', gap: spacing.gap },
  cardHead: { paddingHorizontal: spacing.gapLg, paddingTop: spacing.gapLg, paddingBottom: 4 },
  cardBody: { padding: spacing.gapLg },
  sheetRow: { flexDirection: 'row' },
});
