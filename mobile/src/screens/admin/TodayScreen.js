import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Settings } from 'lucide-react-native';
import { getStaffMonthApi, getTodaySummaryApi, listCorrectionsApi, listLeavesApi, listStaffApi } from '../../api/endpoints';
import { Avatar, Card, DarkCard, EmptyState, ErrorState, Notice, Screen, Skeleton, SkeletonList, StatTile } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { usePlanUsage } from '../../hooks/usePlanUsage';
import { colors, fonts, radius, sizes, spacing, text } from '../../theme';
import { netWorkSeconds, punchesOf } from '../../utils/attendance';
import { currentMonth, formatDate, formatDuration, formatTime, todayStr } from '../../utils/format';

// Live list ke liye har staff ka aaj ka din alag request se aata hai (server mein aisi ek list ka API nahi hai).
// Itne se zyada staff hon to list nahi bante, sirf ginti.
const LIVE_LIMIT = 50;

const SEGMENTS = [
  { key: 'onTime', label: 'On time', color: colors.successBright },
  { key: 'late', label: 'Late', color: '#F2C27B' },
  { key: 'onLeave', label: 'On leave', color: '#8FA9E0' },
  { key: 'notIn', label: 'Not in', color: '#F49A91' },
];

// Ek saath kuch hi requests (server par bojh na pade).
async function mapLimit(items, limit, task) {
  const results = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await task(items[index]).catch(() => null);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

// Staff ka aaj: kis haal mein hai aur list ki line. punches se net time screen par har minute nikalta hai.
function liveOf(day) {
  const punches = day?.punchIn ? punchesOf(day) : [];
  const last = punches[punches.length - 1];
  const first = punches[0];
  const place = first?.locationName;
  if (day?.status === 'LEAVE') return { kind: 'onLeave', tone: 'info', line: `On leave${day.note ? ` · ${day.note}` : ''}`, punches };
  if (!first) return { kind: 'notIn', tone: 'danger', line: 'Not punched in', punches };
  if (last.type === 'OUT') {
    const done = day.status === 'PRESENT' || day.status === 'HALF_DAY';
    return { kind: day.late ? 'late' : 'onTime', tone: 'neutral', line: done ? `Out at ${formatTime(last.time)}` : `On break since ${formatTime(last.time)}`, punches };
  }
  if (day.late) return { kind: 'late', tone: 'warning', line: `Late · In ${formatTime(first.time)}`, punches };
  return { kind: 'onTime', tone: 'success', line: `In ${formatTime(first.time)}${place ? ` · ${place}` : ''}`, punches };
}

function TeamCard({ summary, live }) {
  // Late sirf tab pata chalta hai jab working hours ON hon (server tab hi late ginta hai) aur live list bani ho.
  const late = live ? live.filter((row) => row.kind === 'late').length : 0;
  const counts = { onTime: Math.max(0, summary.present - late), late, onLeave: summary.onLeave, notIn: summary.notMarked };
  const total = Math.max(1, summary.totalStaff);
  const segments = live ? SEGMENTS : SEGMENTS.filter((segment) => segment.key !== 'late');

  return (
    <DarkCard>
      <Text style={styles.teamTitle}>
        <Text style={styles.teamMono}>{summary.present}</Text> of <Text style={styles.teamMono}>{summary.totalStaff}</Text> staff punched in
      </Text>
      <View style={styles.bar} accessibilityLabel={segments.map((segment) => `${counts[segment.key]} ${segment.label}`).join(', ')}>
        {segments.map((segment) =>
          counts[segment.key] > 0 ? <View key={segment.key} style={{ flex: counts[segment.key] / total, backgroundColor: segment.color }} /> : null
        )}
      </View>
      <View style={styles.counts}>
        {segments.map((segment) => (
          <View key={segment.key} style={styles.count}>
            <View style={styles.countTop}>
              <View style={[styles.dot, { backgroundColor: segment.color }]} />
              <Text style={styles.countValue}>{counts[segment.key]}</Text>
            </View>
            <Text style={styles.countLabel}>{segment.key === 'onTime' && !live ? 'In' : segment.label}</Text>
          </View>
        ))}
      </View>
    </DarkCard>
  );
}

// Admin ka home: aaj team kahan hai, kya approve karna baaki hai.
export default function TodayScreen({ navigation }) {
  const { company, hasFeature } = useAuth();
  const { usage } = usePlanUsage();
  const [summary, setSummary] = useState({ data: null, error: '', loading: true });
  const [pending, setPending] = useState(null); // { leave, correction }
  const [live, setLive] = useState({ rows: null, tooMany: false });
  const [now, setNow] = useState(Date.now());

  const load = useCallback(async () => {
    try {
      const res = await getTodaySummaryApi();
      setSummary({ data: res.data, error: '', loading: false });
    } catch (err) {
      setSummary((previous) => ({ ...previous, error: err.message, loading: false }));
    }

    Promise.all([
      listLeavesApi({ status: 'PENDING', limit: 1 }).catch(() => null),
      hasFeature('corrections') ? listCorrectionsApi({ status: 'PENDING', limit: 1 }).catch(() => null) : null,
    ]).then(([leaves, corrections]) =>
      setPending({ leave: leaves?.data.counts.PENDING ?? 0, correction: corrections?.data.counts.PENDING ?? 0 })
    );

    try {
      const staff = await listStaffApi({ status: 'active', limit: LIVE_LIMIT });
      if (staff.data.total > LIVE_LIMIT) {
        setLive({ rows: null, tooMany: true });
        return;
      }
      const today = todayStr();
      const months = await mapLimit(staff.data.items, 5, (person) => getStaffMonthApi(person._id, currentMonth()));
      const rows = staff.data.items.map((person, index) => {
        const day = months[index]?.data.days.find((item) => item.date === today);
        return { staff: person, ...liveOf(day) };
      });
      setLive({ rows, tooMany: false });
      setNow(Date.now());
    } catch {
      setLive((previous) => ({ ...previous, rows: previous.rows ?? [] }));
    }
  }, [hasFeature]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Net time har minute aage badhe
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  const data = summary.data;
  const pendingTotal = pending ? pending.leave + pending.correction : null;
  const order = { onTime: 0, late: 1, onLeave: 2, notIn: 3 };
  const rows = live.rows ? [...live.rows].sort((a, b) => order[a.kind] - order[b.kind] || a.staff.name.localeCompare(b.staff.name)) : null;

  return (
    <Screen edges={['top']} onRefresh={load}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text style={text.small} numberOfLines={1}>
            {company?.name} · Admin
          </Text>
          <Text style={text.screenTitle}>Today, {formatDate(todayStr())}</Text>
        </View>
        {usage && (
          <Pressable style={styles.planChip} onPress={() => navigation.navigate('PlanBilling')} accessibilityRole="button" accessibilityLabel="Plan and billing">
            <Text style={styles.planText}>
              {usage.planName} · {usage.activeStaff}/{usage.staffLimit ?? '∞'}
            </Text>
          </Pressable>
        )}
        <Pressable style={styles.settings} onPress={() => navigation.navigate('Configuration')} accessibilityRole="button" accessibilityLabel="Configuration">
          <Settings size={20} strokeWidth={2} color={colors.onInk} />
        </Pressable>
      </View>

      {summary.loading && !data ? (
        <Skeleton height={170} borderRadius={radius.hero} />
      ) : !data ? (
        <Card>
          <ErrorState message={summary.error} onRetry={load} />
        </Card>
      ) : (
        <>
          {data.locationsCount === 0 && <Notice variant="warning">No office location is set, so staff cannot punch in. Add one in Configuration.</Notice>}
          {data.dayType === 'HOLIDAY' && <Notice variant="info">Today is a holiday.</Notice>}
          {data.dayType === 'WEEK_OFF' && <Notice variant="info">Today is a weekly off.</Notice>}
          <TeamCard summary={data} live={rows} />
        </>
      )}

      <Pressable onPress={() => navigation.navigate('Approvals')} accessibilityRole="button">
        <StatTile
          value={pendingTotal == null ? '–' : String(pendingTotal)}
          label={pending ? `Pending approvals · ${pending.leave} leave · ${pending.correction} correction` : 'Pending approvals'}
          tone={pendingTotal ? 'warning' : undefined}
        />
      </Pressable>

      <Card padded={false}>
        <View style={styles.cardHead}>
          <Text style={text.heading}>Live staff</Text>
        </View>
        {live.tooMany ? (
          <EmptyState title="Too many staff to list here" message={`The live list shows up to ${LIVE_LIMIT} staff. Use the web app's attendance report.`} />
        ) : !rows ? (
          <View style={styles.cardBody}>
            <SkeletonList rows={3} />
          </View>
        ) : !rows.length ? (
          <EmptyState title="No active staff yet" message="Add staff from the Staff tab." />
        ) : (
          rows.map((row, index) => (
            <View key={row.staff._id} style={[styles.liveRow, index < rows.length - 1 && styles.divider]}>
              <Avatar name={row.staff.name} tone={row.tone} />
              <View style={styles.flex}>
                <Text style={text.bodyMedium} numberOfLines={1}>
                  {row.staff.name}
                </Text>
                <Text style={text.small} numberOfLines={1}>
                  {row.line}
                </Text>
              </View>
              {row.punches.length > 0 && <Text style={text.mono}>{formatDuration(Math.floor(netWorkSeconds(row.punches, now) / 60))}</Text>}
            </View>
          ))
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  planChip: {
    minHeight: sizes.touch,
    justifyContent: 'center',
    paddingHorizontal: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.pill,
  },
  planText: { fontFamily: fonts.mono, fontSize: 12, color: colors.ink },
  settings: { width: sizes.touch, height: sizes.touch, borderRadius: sizes.touch / 2, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  teamTitle: { fontFamily: fonts.bodySemiBold, fontSize: 17, color: colors.onInk },
  teamMono: { fontFamily: fonts.monoSemiBold },
  bar: { flexDirection: 'row', height: 10, borderRadius: radius.pill, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.1)', gap: 2 },
  counts: { flexDirection: 'row', gap: spacing.gap },
  count: { flex: 1, gap: 2 },
  countTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  countValue: { fontFamily: fonts.monoSemiBold, fontSize: 18, color: colors.onInk },
  countLabel: { fontFamily: fonts.body, fontSize: 12, color: colors.onInkMuted },
  cardHead: { paddingHorizontal: spacing.gapLg, paddingTop: spacing.gapLg, paddingBottom: 4 },
  cardBody: { padding: spacing.gapLg },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.gap, paddingHorizontal: spacing.gapLg, paddingVertical: 10 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
});
