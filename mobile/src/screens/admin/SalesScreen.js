import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { CalendarPlus, ChevronLeft, ChevronRight, FileSpreadsheet, Users } from 'lucide-react-native';
import { downloadAndShare } from '../../api/download';
import { listClientsApi, listMeetingsApi, meetingExportPath } from '../../api/endpoints';
import { Card, EmptyState, ErrorState, Header, IconButton, ListRow, Notice, Pill, Screen, SecondaryButton, SkeletonList, StatTile } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { useMeetingGrace } from '../../hooks/useMeetingGrace';
import { colors, fonts, radius, sizes, spacing, text } from '../../theme';
import { formatTime, todayStr } from '../../utils/format';
import { effectiveStatus, meetingPill, OPEN_STATUSES, shiftDays, weekOf } from '../../utils/meeting';

const DAY = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Admin: hafte ki sales meetings, din chun kar.
export default function SalesScreen({ navigation }) {
  const { hasFeature } = useAuth();
  const grace = useMeetingGrace();
  const [selected, setSelected] = useState(todayStr);
  const [manager, setManager] = useState('all');
  const [state, setState] = useState({ items: null, error: '' });
  const [clientCount, setClientCount] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [notice, setNotice] = useState('');
  const week = weekOf(selected);

  const load = useCallback(async () => {
    setState((previous) => ({ ...previous, error: '' }));
    try {
      // Poora hafta ek baar mein; din badalne par dobara request nahi.
      const res = await listMeetingsApi({ from: week[0], to: week[6], limit: 100 });
      setState({ items: res.data.items, error: '' });
    } catch (err) {
      setState({ items: null, error: err.message });
    }
    listClientsApi({ status: 'active', limit: 1 })
      .then((res) => setClientCount(res.data.counts.active))
      .catch(() => {});
  }, [week[0]]); // eslint-disable-line react-hooks/exhaustive-deps

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const now = Date.now();
  const all = state.items ?? [];
  const day = all.filter((meeting) => meeting.date === selected).sort((a, b) => new Date(a.startAt) - new Date(b.startAt));
  const managers = [...new Map(day.map((meeting) => [meeting.salesManagerId?._id, meeting.salesManagerId])).values()].filter(Boolean);
  const shown = manager === 'all' ? day : day.filter((meeting) => meeting.salesManagerId?._id === manager);
  const statusOf = (meeting) => effectiveStatus(meeting, grace, now);
  const live = day.filter((meeting) => statusOf(meeting) !== 'CANCELLED');
  const kpis = {
    scheduled: live.length,
    completed: live.filter((meeting) => statusOf(meeting) === 'COMPLETED').length,
    upcoming: live.filter((meeting) => OPEN_STATUSES.includes(statusOf(meeting))).length,
    missed: live.filter((meeting) => statusOf(meeting) === 'MISSED').length,
  };

  const exportExcel = async () => {
    setExporting(true);
    setNotice('');
    try {
      await downloadAndShare(meetingExportPath({ from: week[0], to: week[6] }), `meetings-${week[0]}-to-${week[6]}.xlsx`, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: 'Sales visits',
      });
    } catch (err) {
      setNotice(err.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Screen edges={['top']} onRefresh={load}>
      <Header
        title="Sales visits"
        right={
          <Pressable style={styles.schedule} onPress={() => navigation.navigate('ScheduleMeeting', { date: selected >= todayStr() ? selected : todayStr() })} accessibilityRole="button">
            <CalendarPlus size={18} strokeWidth={2} color={colors.onInk} />
            <Text style={styles.scheduleText}>Schedule</Text>
          </Pressable>
        }
      />

      <View style={styles.week}>
        <IconButton icon={ChevronLeft} onPress={() => setSelected(shiftDays(selected, -7))} accessibilityLabel="Previous week" />
        {week.map((date, index) => {
          const isSelected = date === selected;
          const isToday = date === todayStr();
          return (
            <Pressable
              key={date}
              style={[styles.day, isSelected && styles.daySelected]}
              onPress={() => {
                setSelected(date);
                setManager('all');
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${DAY[index]} ${Number(date.slice(8))}`}
            >
              <Text style={[styles.dayName, isSelected && styles.onDark]}>{DAY[index][0]}</Text>
              <Text style={[styles.dayNumber, isSelected && styles.onDark, isToday && !isSelected && styles.today]}>{Number(date.slice(8))}</Text>
            </Pressable>
          );
        })}
        <IconButton icon={ChevronRight} onPress={() => setSelected(shiftDays(selected, 7))} accessibilityLabel="Next week" />
      </View>

      <View style={styles.kpis}>
        <StatTile value={String(kpis.scheduled)} label="Scheduled" />
        <StatTile value={String(kpis.completed)} label="Completed" tone="success" />
        <StatTile value={String(kpis.upcoming)} label="Upcoming" />
        <StatTile value={String(kpis.missed)} label="Missed" tone="danger" />
      </View>

      {managers.length > 1 && (
        <View style={styles.chips}>
          {[{ _id: 'all', name: 'All' }, ...managers].map((person) => {
            const count = person._id === 'all' ? day.length : day.filter((meeting) => meeting.salesManagerId?._id === person._id).length;
            const isSelected = manager === person._id;
            return (
              <Pressable key={person._id} style={[styles.chip, isSelected && styles.chipSelected]} onPress={() => setManager(person._id)} accessibilityRole="tab" accessibilityState={{ selected: isSelected }}>
                <Text style={[styles.chipText, isSelected && styles.onDark]}>
                  {person.name.split(' ')[0]} <Text style={styles.mono}>{count}</Text>
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      <Card padded={false}>
        {state.error && !state.items ? (
          <ErrorState message={state.error} onRetry={load} />
        ) : !state.items ? (
          <View style={styles.cardBody}>
            <SkeletonList rows={3} />
          </View>
        ) : !shown.length ? (
          <EmptyState title="No visits on this day" message="Tap Schedule to plan a client visit." />
        ) : (
          shown.map((meeting, index) => {
            const pill = meetingPill(meeting, grace, now);
            return (
              <ListRow
                key={meeting._id}
                left={
                  <Text style={styles.time}>
                    {formatTime(meeting.startAt)}
                  </Text>
                }
                title={meeting.clientId?.name ?? meeting.title}
                subtitle={meeting.salesManagerId?.name}
                right={<Pill variant={pill.variant}>{pill.label}</Pill>}
                onPress={() => navigation.navigate('MeetingDetail', { id: meeting._id })}
                divider={index < shown.length - 1}
              />
            );
          })
        )}
      </Card>

      <Notice variant="danger">{notice}</Notice>
      <View style={styles.bottom}>
        <SecondaryButton title={`Clients${clientCount == null ? '' : ` (${clientCount})`}`} icon={Users} onPress={() => navigation.navigate('Clients')} style={styles.flex} />
        {hasFeature('exports') && <SecondaryButton title="Export Excel" icon={FileSpreadsheet} onPress={exportExcel} loading={exporting} style={styles.flex} />}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  schedule: { minHeight: sizes.touch, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, borderRadius: radius.pill, backgroundColor: colors.ink },
  scheduleText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.onInk },
  week: { flexDirection: 'row', alignItems: 'center', gap: 2, marginHorizontal: -8 },
  day: { flex: 1, minHeight: 56, borderRadius: radius.input, alignItems: 'center', justifyContent: 'center', gap: 2 },
  daySelected: { backgroundColor: colors.ink },
  dayName: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.muted },
  dayNumber: { fontFamily: fonts.monoSemiBold, fontSize: 15, color: colors.ink },
  today: { color: colors.success },
  onDark: { color: colors.onInk },
  kpis: { flexDirection: 'row', gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: sizes.touch, justifyContent: 'center', paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: colors.neutralTint },
  chipSelected: { backgroundColor: colors.ink },
  chipText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.neutral },
  mono: { fontFamily: fonts.mono },
  cardBody: { padding: spacing.gapLg },
  time: { fontFamily: fonts.mono, fontSize: 14, color: colors.ink, width: 48 },
  bottom: { flexDirection: 'row', gap: spacing.gap },
});
