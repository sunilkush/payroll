import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { getHolidaysApi, getMonthlyAttendanceApi } from '../../api/endpoints';
import { Card, ErrorState, Header, IconButton, Pill, Screen, Skeleton, StatTile, StatusPill } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { calendarColors, colors, fonts, sizes, spacing, text } from '../../theme';
import { currentMonth, formatDayDate, formatDuration, formatMonth, formatTime, shiftMonth, todayStr } from '../../utils/format';

const WEEK = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const CELL = 36;

const LEGEND = [
  { label: 'Present', color: calendarColors.PRESENT },
  { label: 'Half day', color: calendarColors.HALF_DAY },
  { label: 'Leave', color: calendarColors.LEAVE },
  { label: 'Absent', color: calendarColors.ABSENT },
  { label: 'Holiday / Off', color: calendarColors.HOLIDAY },
  { label: 'Today', color: colors.ink },
];

// Summary tiles: din gin kar (server ka summary.present aadhe din ko 0.5 ginta hai, isliye Half day alag nahi hota).
function countsOf(days) {
  const count = (status) => days.filter((day) => day.status === status).length;
  return { present: count('PRESENT'), halfDay: count('HALF_DAY'), leave: count('LEAVE'), absent: count('ABSENT') };
}

// Monday se shuru hone wala mahine ka grid. Khali cells mahine se pehle ke din hain.
function Calendar({ days, selected, onSelect }) {
  const today = todayStr();
  const lead = days.length ? (days[0].weekday + 6) % 7 : 0;
  const cells = [...Array(lead).fill(null), ...days];
  while (cells.length % 7) cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, index) => cells.slice(index * 7, index * 7 + 7));

  return (
    <View style={styles.calendar}>
      <View style={styles.week}>
        {WEEK.map((label, index) => (
          <Text key={index} style={styles.weekLabel}>
            {label}
          </Text>
        ))}
      </View>
      {weeks.map((week, row) => (
        <View key={row} style={styles.week}>
          {week.map((day, column) => {
            if (!day) return <View key={column} style={styles.cell} />;
            const isToday = day.date === today;
            const future = day.date > today;
            const isSelected = day.date === selected;
            const background = isToday ? colors.ink : calendarColors[day.status];
            return (
              <Pressable
                key={day.date}
                style={[styles.cell, background && { backgroundColor: background }, isSelected && styles.selected]}
                onPress={() => onSelect(day.date)}
                disabled={future}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected, disabled: future }}
                accessibilityLabel={`${formatDayDate(day.date)}${day.status ? `, ${day.status.toLowerCase().replace('_', ' ')}` : ''}`}
              >
                <Text style={[styles.dayNumber, future && styles.future, isToday && styles.todayNumber]}>{Number(day.date.slice(8))}</Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// Chune hue din ki jaankari: status, First In / Last Out / Net work.
function DayCard({ day, canCorrect, onCorrect }) {
  const corrected = Boolean(day.punchIn?.corrected || day.punchOut?.corrected);
  return (
    <Card>
      <View style={styles.dayTop}>
        <Text style={text.heading}>{formatDayDate(day.date)}</Text>
        <View style={styles.pills}>
          {day.status ? <StatusPill status={day.status} /> : null}
          {corrected && <Pill variant="info">Corrected</Pill>}
        </View>
      </View>
      {day.note && !['Half Day', 'In Progress'].includes(day.note) ? <Text style={text.small}>{day.note}</Text> : null}
      <View style={styles.tiles}>
        <StatTile value={formatTime(day.punchIn?.time)} label="First In" />
        <StatTile value={formatTime(day.punchOut?.time)} label="Last Out" />
        <StatTile value={day.punchIn ? formatDuration(day.workedMinutes) : '-'} label="Net work" />
      </View>
      {canCorrect && (
        <Pressable style={styles.link} onPress={onCorrect} accessibilityRole="link">
          <Text style={text.bodySemiBold}>Request a correction for another day</Text>
        </Pressable>
      )}
    </Card>
  );
}

// Staff: mahine ki attendance (GET /attendance?month=), din-wise calendar.
export default function AttendanceScreen({ navigation }) {
  const { hasFeature } = useAuth();
  const [month, setMonth] = useState(currentMonth);
  const [selected, setSelected] = useState(todayStr);
  const [state, setState] = useState({ data: null, error: '', loading: true, refreshing: false });
  const [upcomingHolidays, setUpcomingHolidays] = useState({}); // { 'YYYY-MM-DD': naam }, dikhe hue saal ki
  const year = Number(month.slice(0, 4));

  // Is staff ki branch par lagne wali holidays (aane wale din server ki attendance mein khali hote hain)
  useEffect(() => {
    getHolidaysApi(year)
      .then(({ data }) => setUpcomingHolidays(Object.fromEntries(data.holidays.map((item) => [item.date, item.name]))))
      .catch(() => {});
  }, [year]);

  const load = useCallback(async (target, { pull = false } = {}) => {
    setState((previous) => ({ ...previous, loading: !pull, refreshing: pull, error: '' }));
    try {
      const res = await getMonthlyAttendanceApi(target);
      setState({ data: res.data, error: '', loading: false, refreshing: false });
    } catch (err) {
      setState({ data: null, error: err.message, loading: false, refreshing: false });
    }
  }, []);

  // Screen par aane par (jaise correction bhejne ke baad) taaza.
  useFocusEffect(
    useCallback(() => {
      load(month);
    }, [load, month])
  );

  const changeMonth = (by) => {
    const next = shiftMonth(month, by);
    setMonth(next);
    // Aaj wale mahine mein aaj chuna rahe, baaki mein pehli tarikh.
    setSelected(next === currentMonth() ? todayStr() : `${next}-01`);
  };

  // Aane wale din server ki attendance mein khali hote hain; jo holiday pata hai (dashboard se) use grey dikhao.
  const days = (state.data?.month === month ? state.data.days : []).map((day) =>
    !day.status && upcomingHolidays[day.date] ? { ...day, status: 'HOLIDAY', note: upcomingHolidays[day.date] } : day
  );
  const counts = countsOf(days);
  const selectedDay = days.find((day) => day.date === selected);
  const isCurrent = month === currentMonth();

  return (
    <Screen edges={['top']} onRefresh={() => load(month, { pull: true })} refreshing={state.refreshing}>
      <Header
        title="Attendance"
        right={
          <View style={styles.switcher}>
            <IconButton icon={ChevronLeft} onPress={() => changeMonth(-1)} accessibilityLabel="Previous month" />
            <Text style={styles.monthLabel}>{formatMonth(month)}</Text>
            <View style={isCurrent && styles.hidden} pointerEvents={isCurrent ? 'none' : 'auto'}>
              <IconButton icon={ChevronRight} onPress={() => changeMonth(1)} accessibilityLabel="Next month" />
            </View>
          </View>
        }
      />

      {state.error && !days.length ? (
        <Card>
          <ErrorState message={state.error} onRetry={() => load(month)} />
        </Card>
      ) : (
        <>
          <View style={styles.tiles}>
            <StatTile value={String(counts.present)} label="Present" tone="success" />
            <StatTile value={String(counts.halfDay)} label="Half day" tone="warning" />
            <StatTile value={String(counts.leave)} label="Leave" tone="info" />
            <StatTile value={String(counts.absent)} label="Absent" tone="danger" />
          </View>

          <Card>
            {state.loading && !days.length ? (
              <Skeleton height={CELL * 6 + 40} />
            ) : (
              <Calendar days={days} selected={selected} onSelect={setSelected} />
            )}
            <View style={styles.legend}>
              {LEGEND.map((item) => (
                <View key={item.label} style={styles.legendItem}>
                  <View style={[styles.swatch, { backgroundColor: item.color }]} />
                  <Text style={text.small}>{item.label}</Text>
                </View>
              ))}
            </View>
          </Card>

          {selectedDay && (
            <DayCard
              day={selectedDay}
              canCorrect={hasFeature('corrections')}
              onCorrect={() => navigation.navigate('PunchCorrection', { date: selectedDay.date })}
            />
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  switcher: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  monthLabel: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.ink, minWidth: 64, textAlign: 'center' },
  hidden: { opacity: 0 },
  tiles: { flexDirection: 'row', gap: spacing.gap },
  calendar: { gap: 6 },
  week: { flexDirection: 'row', justifyContent: 'space-between' },
  weekLabel: { width: CELL, textAlign: 'center', fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.muted },
  cell: { width: CELL, height: CELL, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  selected: { borderWidth: 2, borderColor: colors.success },
  dayNumber: { fontFamily: fonts.mono, fontSize: 14, color: colors.ink },
  todayNumber: { color: colors.onInk, fontFamily: fonts.monoSemiBold },
  future: { color: colors.inputBorder },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.gapLg, rowGap: 8, marginTop: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 12, height: 12, borderRadius: 4 },
  dayTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.gap, flexWrap: 'wrap' },
  pills: { flexDirection: 'row', gap: 6 },
  link: { minHeight: sizes.touch, justifyContent: 'center' },
});
