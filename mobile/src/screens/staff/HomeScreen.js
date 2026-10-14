import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LogOut, MapPin } from 'lucide-react-native';
import { Card, DarkCard, ErrorState, Header, IconButton, Notice, Pill, ProgressBar, Screen, SecondaryButton, Skeleton, StatTile, Toast } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from '../../hooks/useLocation';
import { useToday } from '../../hooks/useToday';
import { colors, fonts, radius, sizes, spacing, text } from '../../theme';
import { dayPill, formatClock, minutesOfTime, netWorkSeconds, punchesOf, timelineOf } from '../../utils/attendance';
import { formatDate, formatDuration, formatTime } from '../../utils/format';
import { formatDistance, nearestLocation } from '../../utils/geo';
import { getMaxGpsAccuracy } from '../../utils/gpsLimit';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const greeting = (date) => {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  return hour < 17 ? 'Good afternoon' : 'Good evening';
};

const initialsOf = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');

// Har second badalne wala "abhi" (server ki ghadi se). Sirf jinhe chahiye wahi components ise lete hain.
function useTicker(serverNow) {
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    const timer = setInterval(() => setNow(serverNow()), 1000);
    return () => clearInterval(timer);
  }, [serverNow]);
  return now;
}

// Upar ka chip: office ke andar ho ya nahi (yahan sirf jaankari; asli faisla punch par server karta hai).
function LocationChip({ locations }) {
  const location = useLocation({ ask: false });
  const maxAccuracy = getMaxGpsAccuracy();

  let tone = 'neutral';
  let label = 'Finding your location…';
  let onPress;
  if (!locations?.length) {
    label = 'No office location set';
  } else if (location.status === 'denied' || location.status === 'off') {
    label = location.status === 'off' ? 'Location is off · Tap to turn on' : 'Location not allowed · Tap to allow';
    onPress = location.status === 'denied' && location.canAskAgain ? location.refresh : location.openSettings;
  } else if (location.status === 'error') {
    label = 'Could not get location · Tap to retry';
    onPress = location.refresh;
  } else if (location.position) {
    const { accuracy } = location.position;
    const geo = nearestLocation(locations, location.position);
    const place = `${geo.inside ? 'Inside' : 'Outside'} ${geo.location.name} · ${formatDistance(geo.distance)} away`;
    if (accuracy > maxAccuracy) {
      tone = 'warning';
      label = `Weak GPS ±${accuracy} m · move to open sky`;
    } else {
      tone = geo.inside ? 'success' : 'danger';
      label = `${place} · GPS ±${accuracy} m`;
    }
    onPress = location.refresh;
  }

  const palette = {
    neutral: { background: colors.neutralTint, color: colors.neutral },
    success: { background: colors.successTint, color: colors.successDark },
    warning: { background: colors.warningTint, color: colors.warning },
    danger: { background: colors.dangerTint, color: colors.danger },
  }[tone];

  return (
    <Pressable
      style={[styles.chip, { backgroundColor: palette.background }]}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={label}
    >
      <MapPin size={16} strokeWidth={2} color={palette.color} />
      <Text style={[styles.chipText, { color: palette.color }]} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

// Dark card: aaj ka net kaam (har second), required ke saamne progress, aur Punch button.
function TodayCard({ data, serverNow, onPunch }) {
  const now = useTicker(serverNow);
  const { metrics, workingHoursConfig, attendance } = data;
  const punches = punchesOf(attendance);
  const seconds = netWorkSeconds(punches, now, metrics?.lunchDeductionMinutes ?? 0);
  const required = metrics?.requiredWorkMinutes ?? workingHoursConfig?.requiredWorkMinutes ?? 510;
  const remaining = Math.max(0, required - Math.floor(seconds / 60));
  const working = Boolean(metrics?.isCurrentlyWorking);
  const pill = dayPill(metrics);

  // 4:30 ke baad bhi kaam chal raha ho aur ghante poore na hon: aage kaam karte raho (Half day kabhi nahi likhte).
  const cutoff = workingHoursConfig?.halfDayCutoffTime ?? '16:30';
  const nowDate = new Date(now);
  const pastCutoff = nowDate.getHours() * 60 + nowDate.getMinutes() >= minutesOfTime(cutoff);
  const showCutoff = working && pastCutoff && remaining > 0;

  return (
    <DarkCard>
      <View style={styles.cardTop}>
        <Text style={styles.onDarkLabel}>Net work today</Text>
        <Pill variant={pill.variant}>{pill.label}</Pill>
      </View>
      <Text style={styles.timer} accessibilityLabel={`Net work today ${formatDuration(Math.floor(seconds / 60))}`}>
        {formatClock(seconds)}
      </Text>
      <ProgressBar value={seconds / (required * 60)} tone="successBright" accessibilityLabel="Progress towards required hours" />
      <Text style={styles.onDarkMono}>
        Required {formatDuration(required)} · Remaining {formatDuration(remaining)}
      </Text>
      {showCutoff && (
        <View style={styles.cutoff}>
          <Text style={styles.cutoffText}>
            Half-day cutoff {formatTime12(cutoff)} — keep working to reach {formatDuration(required)}
          </Text>
        </View>
      )}
      <SecondaryButton title={working ? 'Punch Out' : 'Punch In'} onPress={onPunch} style={styles.punchButton} />
    </DarkCard>
  );
}

// '16:30' -> '4:30 PM' (cutoff ki line mein, jaisa design mein hai)
function formatTime12(time) {
  const minutes = minutesOfTime(time);
  const hour = Math.floor(minutes / 60);
  return `${hour % 12 || 12}:${String(minutes % 60).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`;
}

// IN -> OUT ki jodiyan; beech mein break; chalu hissa dashed + "running".
function PunchesCard({ data, serverNow, onHistory }) {
  const now = useTicker(serverNow);
  const rows = timelineOf(punchesOf(data.attendance), now);

  return (
    <Card>
      <View style={styles.cardTop}>
        <Text style={text.heading}>Today's punches</Text>
        <Pressable style={styles.link} onPress={onHistory} accessibilityRole="link">
          <Text style={text.bodySemiBold}>History</Text>
        </Pressable>
      </View>
      {!rows.length && <Text style={text.small}>No punches yet today.</Text>}
      {rows.map((row, index) =>
        row.kind === 'break' ? (
          <View key={`break-${index}`} style={styles.breakRow}>
            <View style={styles.breakLine} />
            <Text style={text.small}>
              Break <Text style={styles.mutedMono}>{formatDuration(row.minutes)}</Text> · excluded from work time
            </Text>
          </View>
        ) : (
          <View key={`work-${index}`} style={[styles.workRow, !row.out && styles.workRowOpen]}>
            <Text style={text.mono}>
              {formatTime(row.in.time)} <Text style={styles.punchType}>IN</Text>
              {'  →  '}
              {row.out ? (
                <>
                  {formatTime(row.out.time)} <Text style={styles.punchType}>OUT</Text>
                </>
              ) : (
                <Text style={styles.running}>running</Text>
              )}
            </Text>
            <Text style={text.mono}>{formatDuration(row.minutes)}</Text>
          </View>
        )
      )}
    </Card>
  );
}

function HomeSkeleton() {
  return (
    <View style={styles.skeleton}>
      <Skeleton height={40} borderRadius={radius.pill} />
      <Skeleton height={260} borderRadius={radius.hero} />
      <Skeleton height={150} borderRadius={radius.card} />
    </View>
  );
}

// Staff ka home: aaj ka kaam (server ki ghadi se chalta timer), location chip, punches.
export default function HomeScreen({ navigation, route }) {
  const { user, logout } = useAuth();
  const today = useToday();
  const toast = route.params?.toast ?? '';
  const hideToast = useCallback(() => navigation.setParams({ toast: undefined }), [navigation]);
  const now = new Date(today.serverNow());
  const firstName = user.name.split(' ')[0];
  const { data } = today;

  return (
    <Screen edges={['top']} onRefresh={today.reload} refreshing={today.refreshing} overlay={<Toast message={toast} onHide={hideToast} />}>
      <View style={styles.header}>
        <View style={styles.avatar} accessibilityLabel={user.name}>
          <Text style={styles.avatarText}>{initialsOf(user.name)}</Text>
        </View>
        <View style={styles.headerText}>
          <Header title={`${greeting(now)}, ${firstName}`} subtitle={`${WEEKDAYS[now.getDay()]}, ${formatDate(now)}`} />
        </View>
        <IconButton icon={LogOut} onPress={logout} accessibilityLabel="Sign out" />
      </View>

      {today.loading && !data ? (
        <HomeSkeleton />
      ) : !data ? (
        <Card>
          <ErrorState message={today.error} onRetry={today.reload} />
        </Card>
      ) : (
        <>
          <LocationChip locations={data.locations} />
          {data.holidayName && <Notice variant="info">Today is a holiday: {data.holidayName}</Notice>}
          {!data.holidayName && data.isWeekOff && <Notice variant="info">Today is your weekly off ({data.weekOffDayName}).</Notice>}
          <Notice variant="warning">{data.workHoursMessage}</Notice>
          {today.error ? <Notice variant="danger">{today.error}</Notice> : null}

          <TodayCard data={data} serverNow={today.serverNow} onPunch={() => navigation.navigate('Punch')} />

          <View style={styles.tiles}>
            <View style={styles.tileRow}>
              <StatTile value={formatTime(data.metrics?.firstIn)} label="First In" />
              <StatTile value={formatTime(data.metrics?.lastOut)} label="Last Out" />
            </View>
            <View style={styles.tileRow}>
              <StatTile value={formatDuration(data.metrics?.totalBreakMinutes ?? 0)} label="Break" />
              <StatTile value={String(data.metrics?.punchCount ?? 0)} label="Punches" />
            </View>
          </View>

          <PunchesCard data={data} serverNow={today.serverNow} onHistory={() => navigation.navigate('Attendance')} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.gap },
  headerText: { flex: 1 },
  avatar: { width: sizes.touch, height: sizes.touch, borderRadius: sizes.touch / 2, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.onInk },
  chip: {
    minHeight: sizes.touch,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipText: { flexShrink: 1, fontFamily: fonts.bodySemiBold, fontSize: 13 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.gap },
  onDarkLabel: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.onInkMuted },
  timer: { fontFamily: fonts.monoSemiBold, fontSize: 44, lineHeight: 52, color: colors.onInk, letterSpacing: 1 },
  onDarkMono: { fontFamily: fonts.mono, fontSize: 13, color: colors.onInkMuted },
  cutoff: { backgroundColor: colors.warningTint, borderRadius: radius.input, paddingHorizontal: 12, paddingVertical: 10 },
  cutoffText: { fontFamily: fonts.bodyMedium, fontSize: 13, lineHeight: 18, color: colors.warning },
  punchButton: { marginTop: 4, borderColor: colors.card },
  tiles: { gap: spacing.gap },
  tileRow: { flexDirection: 'row', gap: spacing.gap },
  link: { minHeight: sizes.touch, justifyContent: 'center' },
  workRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.input,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  workRowOpen: { borderStyle: 'dashed', borderColor: colors.info, backgroundColor: colors.infoTint },
  punchType: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: colors.muted },
  running: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.info },
  breakRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 12 },
  breakLine: { width: 2, height: 20, backgroundColor: colors.line, borderRadius: 1 },
  mutedMono: { fontFamily: fonts.mono, color: colors.muted },
  skeleton: { gap: spacing.gapLg },
});
