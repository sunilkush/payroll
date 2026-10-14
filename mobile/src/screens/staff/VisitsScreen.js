import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Briefcase } from 'lucide-react-native';
import { getMeetingDashboardApi, listMeetingsApi } from '../../api/endpoints';
import { Card, EmptyState, ErrorState, Header, Pill, PrimaryButton, ProgressBar, Screen, SecondaryButton, SkeletonList } from '../../components';
import { useLocation } from '../../hooks/useLocation';
import { colors, fonts, radius, spacing, text } from '../../theme';
import { formatDayDate, formatTime, todayStr } from '../../utils/format';
import { distanceInMeters, formatDistance } from '../../utils/geo';
import { checkInWindow } from '../../utils/visit';

const OPEN = ['SCHEDULED', 'QR_SENT'];

// Card ki pill: Completed / Checked in / Check-in open / Upcoming / Missed / Cancelled
function pillOf(meeting, now) {
  if (meeting.status === 'COMPLETED') return { variant: 'success', label: 'Completed' };
  if (meeting.status === 'CHECKED_IN') return { variant: 'info', label: 'Checked in' };
  if (meeting.status === 'MISSED') return { variant: 'danger', label: 'Missed' };
  if (meeting.status === 'CANCELLED') return { variant: 'neutral', label: 'Cancelled' };
  const { opensAt, closesAt } = checkInWindow(meeting);
  if (now >= opensAt && now <= closesAt) return { variant: 'neutral', label: 'Check-in open' };
  return { variant: 'neutral', label: 'Upcoming' };
}

// Jis meeting par abhi dhyan chahiye: chalu visit, warna jiska check-in khula hai, warna agli aane wali.
function activeOf(meetings, now) {
  return (
    meetings.find((meeting) => meeting.status === 'CHECKED_IN') ??
    meetings.find((meeting) => OPEN.includes(meeting.status) && now <= checkInWindow(meeting).closesAt)
  );
}

// App band hokar khule to chalu visit par ek hi baar seedha le jaate hain.
let resumedThisSession = false;

function MeetingCard({ meeting, active, now, position, onStart, onContinue }) {
  const pill = pillOf(meeting, now);
  const { opensAt, closesAt } = checkInWindow(meeting);
  const canStart = OPEN.includes(meeting.status) && now >= opensAt && now <= closesAt;
  const place = meeting.location;
  const distance = position && place?.lat != null ? formatDistance(Math.round(distanceInMeters(position, place))) : null;
  const where = [place?.address || meeting.clientAddress, distance && `${distance} away`].filter(Boolean).join(' · ');

  return (
    <Card style={active && styles.active}>
      <View style={styles.top}>
        <Text style={text.mono}>
          {formatTime(meeting.startAt)} – {formatTime(meeting.endAt)}
        </Text>
        <Pill variant={pill.variant}>{pill.label}</Pill>
      </View>
      <View style={styles.titles}>
        <Text style={text.heading}>{meeting.client || meeting.title}</Text>
        {meeting.client && meeting.title ? <Text style={text.small}>{meeting.title}</Text> : null}
        {where ? <Text style={text.small}>{where}</Text> : null}
      </View>
      {OPEN.includes(meeting.status) && (
        <Text style={text.small}>
          Check-in{' '}
          <Text style={styles.mono}>
            {formatTime(opensAt)} – {formatTime(closesAt)}
          </Text>
        </Text>
      )}
      {active && meeting.status === 'CHECKED_IN' && <PrimaryButton title="Continue visit" onPress={onContinue} />}
      {active && OPEN.includes(meeting.status) && (
        <PrimaryButton
          title={canStart ? 'Start check-in' : `Check-in opens at ${formatTime(opensAt)}`}
          onPress={onStart}
          disabled={!canStart}
          style={canStart && styles.start}
        />
      )}
      {!active && meeting.status === 'CHECKED_IN' && <SecondaryButton title="Continue visit" onPress={onContinue} />}
    </Card>
  );
}

// Staff (sales manager): aaj ki client visits.
export default function VisitsScreen({ navigation }) {
  const location = useLocation({ ask: false });
  const [state, setState] = useState({ meetings: null, error: '', loading: true, refreshing: false });

  const load = useCallback(async ({ pull = false } = {}) => {
    if (pull) setState((previous) => ({ ...previous, refreshing: true }));
    try {
      const today = todayStr();
      // Dashboard: server ka status (Missed bhi). List: client ka pata aur meeting ki location + radius.
      const [dashboard, list] = await Promise.all([getMeetingDashboardApi(), listMeetingsApi({ from: today, to: today, limit: 50 })]);
      const full = new Map(list.data.items.map((item) => [item._id, item]));
      const meetings = dashboard.data.today.map((item) => {
        const detail = full.get(item._id);
        return { ...item, location: detail?.location, clientAddress: detail?.clientId?.address, clientId: detail?.clientId };
      });
      setState({ meetings, error: '', loading: false, refreshing: false });

      // Check-in ho chuka par visit poori nahi hui (app band ho gaya tha): seedha selfie wale kadam par.
      // Server ka CHECKED_IN hi pakka nishaan hai; photo / notes phone mein bache hon to wo screen unhe wapas laati hai.
      if (!resumedThisSession) {
        resumedThisSession = true;
        const open = meetings.find((meeting) => meeting.status === 'CHECKED_IN');
        if (open) navigation.navigate('VisitComplete', { meeting: open });
      }
    } catch (err) {
      setState((previous) => ({ ...previous, error: err.message, loading: false, refreshing: false }));
    }
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const now = new Date();
  const meetings = state.meetings ?? [];
  const counted = meetings.filter((meeting) => meeting.status !== 'CANCELLED');
  const done = counted.filter((meeting) => meeting.status === 'COMPLETED').length;
  const active = activeOf(meetings, now);

  return (
    <Screen edges={['top']} onRefresh={() => load({ pull: true })} refreshing={state.refreshing}>
      <View style={styles.headerBlock}>
        <Text style={text.small}>{formatDayDate(todayStr())}</Text>
        <Header title="Client visits" />
      </View>

      {state.loading && !state.meetings ? (
        <SkeletonList rows={3} />
      ) : state.error && !state.meetings ? (
        <Card>
          <ErrorState message={state.error} onRetry={load} />
        </Card>
      ) : !meetings.length ? (
        <Card>
          <EmptyState icon={Briefcase} title="No visits today" message="Meetings your admin schedules for you appear here." />
        </Card>
      ) : (
        <>
          <View style={styles.progress}>
            <Text style={styles.progressText}>
              {done} / {counted.length} done
            </Text>
            <ProgressBar value={counted.length ? done / counted.length : 0} tone="success" accessibilityLabel="Visits done today" />
          </View>
          {meetings.map((meeting) => (
            <MeetingCard
              key={meeting._id}
              meeting={meeting}
              active={active?._id === meeting._id}
              now={now}
              position={location.position}
              onStart={() => navigation.navigate('VisitCheckIn', { meeting })}
              onContinue={() => navigation.navigate('VisitComplete', { meeting })}
            />
          ))}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerBlock: { gap: 2 },
  progress: { gap: 8 },
  progressText: { fontFamily: fonts.monoSemiBold, fontSize: 15, color: colors.ink },
  active: { borderColor: colors.ink, borderWidth: 2, borderRadius: radius.card },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.gap },
  titles: { gap: 2 },
  mono: { fontFamily: fonts.mono, color: colors.ink },
  start: { backgroundColor: colors.success },
});
