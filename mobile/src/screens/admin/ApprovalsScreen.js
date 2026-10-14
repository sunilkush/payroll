import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { CircleCheck } from 'lucide-react-native';
import {
  approveCorrectionApi,
  approveLeaveApi,
  listCorrectionsApi,
  listLeavesApi,
  rejectCorrectionApi,
  rejectLeaveApi,
} from '../../api/endpoints';
import { Avatar, Card, EmptyState, ErrorState, Header, Notice, Pill, Screen, SegmentedControl, SkeletonList, UndoToast } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { colors, fonts, radius, sizes, spacing, text } from '../../theme';
import { formatDate, formatTime } from '../../utils/format';
import { dayCount } from '../../utils/leave';

const UNDO_MS = 5000;
const HALF = { FIRST: 'First half', SECOND: 'Second half' };

const API = {
  leave: { approve: approveLeaveApi, reject: rejectLeaveApi },
  correction: { approve: approveCorrectionApi, reject: rejectCorrectionApi },
};

const rangeOf = (leave) => (leave.fromDate === leave.toDate ? formatDate(leave.fromDate) : `${formatDate(leave.fromDate)} – ${formatDate(leave.toDate)}`);
const times = (item) =>
  [item?.punchIn && `In ${formatTime(item.punchIn)}`, item?.punchOut && `Out ${formatTime(item.punchOut)}`].filter(Boolean).join(' · ') || 'In — · Out —';

function RequestCard({ kind, item, onDecide }) {
  const [note, setNote] = useState('');
  const person = item.userId ?? {};
  const chips =
    kind === 'leave'
      ? [`${item.type} · ${item.halfDay ? HALF[item.halfDay] : dayCount(item.days)}`, rangeOf(item)]
      : [formatDate(item.date), `Asked: ${times(item)}`];

  return (
    <Card>
      <View style={styles.person}>
        <Avatar name={person.name} />
        <View style={styles.flex}>
          <Text style={text.bodySemiBold} numberOfLines={1}>
            {person.name ?? 'Staff member'}
          </Text>
          <Text style={text.small}>
            {[person.employeeCode, `Applied ${formatDate(item.createdAt)}`].filter(Boolean).join(' · ')}
          </Text>
        </View>
      </View>
      <View style={styles.chips}>
        {chips.map((chip) => (
          <Pill key={chip}>{chip}</Pill>
        ))}
        {kind === 'correction' && <Pill variant="warning">Recorded: {times(item.recorded)}</Pill>}
      </View>
      <View style={styles.quote}>
        <Text style={styles.quoteText}>“{item.reason}”</Text>
      </View>
      <TextInput
        style={styles.comment}
        value={note}
        onChangeText={setNote}
        placeholder="Add a comment (optional)"
        placeholderTextColor={colors.muted}
        maxLength={300}
        accessibilityLabel="Comment for the staff member"
      />
      <View style={styles.actions}>
        <Pressable style={[styles.action, styles.reject]} onPress={() => onDecide('reject', note.trim())} accessibilityRole="button">
          <Text style={[styles.actionText, styles.rejectText]}>Reject</Text>
        </Pressable>
        <Pressable style={[styles.action, styles.approve]} onPress={() => onDecide('approve', note.trim())} accessibilityRole="button">
          <Text style={[styles.actionText, styles.approveText]}>Approve</Text>
        </Pressable>
      </View>
    </Card>
  );
}

// Admin: pending leave aur punch correction requests. Approve / Reject turant list se hat jata hai;
// server ko 5 second baad jata hai, tab tak "Undo" se wapas.
export default function ApprovalsScreen() {
  const { hasFeature } = useAuth();
  const corrections = hasFeature('corrections');
  const [tab, setTab] = useState('leave');
  const [lists, setLists] = useState({ leave: null, correction: null });
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [undo, setUndo] = useState(null); // { message }
  const pending = useRef(null); // { kind, item, action, note, index, timer }

  const load = useCallback(async () => {
    setLoadError('');
    try {
      const [leaves, fixes] = await Promise.all([
        listLeavesApi({ status: 'PENDING', limit: 50 }),
        corrections ? listCorrectionsApi({ status: 'PENDING', limit: 50 }) : null,
      ]);
      // Jo abhi undo ke intezaar mein hai wo wapas na aa jaye
      const skip = pending.current?.item._id;
      setLists({
        leave: leaves.data.items.filter((item) => item._id !== skip),
        correction: fixes ? fixes.data.items.filter((item) => item._id !== skip) : [],
      });
    } catch (err) {
      setLoadError(err.message);
    }
  }, [corrections]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Server ko bhejo. Fail ho to card wapas, error ke saath.
  const commit = useCallback(async () => {
    const job = pending.current;
    if (!job) return;
    clearTimeout(job.timer);
    pending.current = null;
    setUndo(null);
    try {
      await API[job.kind][job.action](job.item._id, job.note);
    } catch (err) {
      setError(`${job.item.userId?.name ?? 'Request'}: ${err.message}`);
      // 409 = kisi aur ne pehle hi nipta diya; tab wapas mat lao
      if (err.status !== 409) {
        setLists((previous) => {
          const list = [...(previous[job.kind] ?? [])];
          list.splice(Math.min(job.index, list.length), 0, job.item);
          return { ...previous, [job.kind]: list };
        });
      }
    }
  }, []);

  // Screen chhodne par jo baaki hai wo bhej do (undo ka mauka khatam).
  useEffect(() => () => commit(), [commit]);

  const decide = (kind, item, action, note) => {
    commit(); // pichhla undo turant pakka
    setError('');
    const list = lists[kind] ?? [];
    const index = list.findIndex((entry) => entry._id === item._id);
    setLists((previous) => ({ ...previous, [kind]: previous[kind].filter((entry) => entry._id !== item._id) }));
    pending.current = { kind, item, action, note, index, timer: setTimeout(commit, UNDO_MS) };
    const what = kind === 'leave' ? 'Leave' : 'Correction';
    setUndo({ message: `${what} ${action === 'approve' ? 'approved' : 'rejected'} for ${item.userId?.name ?? 'staff'}` });
  };

  const undoLast = () => {
    const job = pending.current;
    if (!job) return;
    clearTimeout(job.timer);
    pending.current = null;
    setUndo(null);
    setLists((previous) => {
      const list = [...(previous[job.kind] ?? [])];
      list.splice(Math.min(job.index, list.length), 0, job.item);
      return { ...previous, [job.kind]: list };
    });
  };

  const options = [
    { value: 'leave', label: `Leave (${lists.leave?.length ?? '–'})` },
    ...(corrections ? [{ value: 'correction', label: `Corrections (${lists.correction?.length ?? '–'})` }] : []),
  ];
  const items = lists[tab];

  return (
    <Screen edges={['top']} onRefresh={load} overlay={<UndoToast message={undo?.message} onUndo={undoLast} />}>
      <Header title="Approvals" />
      {options.length > 1 && <SegmentedControl options={options} value={tab} onChange={setTab} />}
      <Notice variant="danger">{error}</Notice>

      {loadError && !items ? (
        <Card>
          <ErrorState message={loadError} onRetry={load} />
        </Card>
      ) : !items ? (
        <SkeletonList rows={2} />
      ) : !items.length ? (
        <Card>
          <EmptyState icon={CircleCheck} title="All caught up" message={`No ${tab === 'leave' ? 'leave' : 'correction'} requests are waiting.`} />
        </Card>
      ) : (
        items.map((item) => (
          <RequestCard key={item._id} kind={tab} item={item} onDecide={(action, note) => decide(tab, item, action, note)} />
        ))
      )}
      {/* Undo toast ke neeche aakhri card chhupe nahi */}
      <View style={styles.toastSpace} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  person: { flexDirection: 'row', alignItems: 'center', gap: spacing.gap },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  quote: { borderLeftWidth: 3, borderLeftColor: colors.line, paddingLeft: 10 },
  quoteText: { ...text.body, fontStyle: 'italic', color: colors.neutral },
  comment: {
    minHeight: sizes.touch,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radius.input,
    paddingHorizontal: 12,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.ink,
    backgroundColor: colors.card,
  },
  actions: { flexDirection: 'row', gap: spacing.gap },
  action: { flex: 1, height: 48, borderRadius: radius.button, alignItems: 'center', justifyContent: 'center' },
  reject: { backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.danger },
  approve: { backgroundColor: colors.success },
  actionText: { fontFamily: fonts.bodySemiBold, fontSize: 15 },
  rejectText: { color: colors.danger },
  approveText: { color: colors.onInk },
  toastSpace: { height: 64 },
});
