import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { CalendarHeart } from 'lucide-react-native';
import { Card, DarkCard, DateTile, EmptyState, ErrorState, Header, Pill, Screen, SegmentedControl, SkeletonList, StatTile } from '../../components';
import { colors, fonts, radius, sizes, spacing, text } from '../../theme';
import { getHolidaysApi } from '../../api/endpoints';
import { todayStr } from '../../utils/format';
import { holidayTypeLabel, inDaysLabel, weekdayName, weekdayOf, weekdayShort } from '../../utils/holiday';

const VIEWS = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'year', label: 'Full year' },
];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Staff: company ki paid holidays (Leave tab ke "Holidays" se).
export default function StaffHolidaysScreen({ navigation }) {
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const [view, setView] = useState('upcoming');
  const [state, setState] = useState({ data: null, error: '' });

  // GET /holidays: sirf wahi jo is staff ki branch par lagti hain
  const load = useCallback(async () => {
    setState((previous) => ({ ...previous, error: '' }));
    try {
      const { data } = await getHolidaysApi(year);
      const today = todayStr();
      setState({ data: { ...data, holidays: data.holidays.map((item) => ({ ...item, past: item.date < today })) }, error: '' });
    } catch (err) {
      setState({ data: null, error: err.message });
    }
  }, [year]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const data = state.data;
  const holidays = data?.holidays ?? [];
  const upcoming = holidays.filter((item) => !item.past);
  const next = upcoming[0];
  const shown = view === 'upcoming' ? upcoming : holidays;
  const weekOff = data?.weekOffDays ?? [0];

  return (
    <Screen onRefresh={load}>
      <Header
        title="Holidays"
        onBack={navigation.goBack}
        right={
          <Pressable
            style={styles.yearChip}
            onPress={() => {
              setState({ data: null, error: '' });
              setYear(year === thisYear ? thisYear - 1 : thisYear);
            }}
            accessibilityRole="button"
            accessibilityLabel={`Year ${year}, tap to change`}
          >
            <Text style={styles.yearText}>{year}</Text>
          </Pressable>
        }
      />

      {state.error && !data ? (
        <Card>
          <ErrorState message={state.error} onRetry={load} />
        </Card>
      ) : !data ? (
        <SkeletonList rows={4} />
      ) : (
        <>
          {next && (
            <DarkCard>
              <Text style={styles.onDarkLabel}>Next holiday</Text>
              <View style={styles.nextRow}>
                <DateTile date={next.date} tone="warning" size={60} />
                <View style={styles.flex}>
                  <Text style={styles.nextName}>{next.name}</Text>
                  <Text style={styles.onDarkSmall}>
                    {weekdayName(next.date)} · {inDaysLabel(next.date)}
                  </Text>
                </View>
              </View>
            </DarkCard>
          )}

          <View style={styles.tiles}>
            <StatTile value={String(holidays.length)} label="Paid holidays" />
            <StatTile value={String(upcoming.length)} label="Still to come" tone="success" />
            <StatTile value={weekOff.map((day) => DAY_SHORT[day]).join(', ')} label="Weekly off" />
          </View>

          <SegmentedControl options={VIEWS} value={view} onChange={setView} />

          <Card padded={false}>
            {!shown.length ? (
              <EmptyState icon={CalendarHeart} title={view === 'upcoming' ? 'No more holidays this year' : `No holidays in ${year}`} />
            ) : (
              shown.map((item, index) => {
                const onWeekOff = weekOff.includes(weekdayOf(item.date));
                const isNext = next?.date === item.date;
                return (
                  <View key={item.date} style={[styles.row, index < shown.length - 1 && styles.divider, item.past && styles.past]}>
                    <DateTile date={item.date} tone={isNext ? 'ink' : 'neutral'} />
                    <View style={styles.flex}>
                      <Text style={text.bodyMedium}>{item.name}</Text>
                      <Text style={text.small}>
                        {weekdayShort(item.date)} · {holidayTypeLabel(item.type)}
                      </Text>
                    </View>
                    <View style={styles.pills}>
                      {isNext && <Pill variant="ink">Next</Pill>}
                      {onWeekOff && <Pill variant="warning">On week-off</Pill>}
                      {item.past && <Pill variant="neutral">Done</Pill>}
                    </View>
                  </View>
                );
              })
            )}
          </Card>

          <Text style={text.small}>Holidays are paid and never count as absent.</Text>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  yearChip: { minHeight: sizes.touch, justifyContent: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingHorizontal: 14 },
  yearText: { fontFamily: fonts.mono, fontSize: 13, color: colors.ink },
  onDarkLabel: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.onInkMuted },
  nextRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.gap },
  nextName: { fontFamily: fonts.heading, fontSize: 22, color: colors.onInk },
  onDarkSmall: { fontFamily: fonts.body, fontSize: 14, color: colors.onInkMuted },
  tiles: { flexDirection: 'row', gap: spacing.gap },
  row: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: spacing.gap, paddingHorizontal: spacing.gapLg, paddingVertical: 10 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  past: { opacity: 0.6 },
  pills: { alignItems: 'flex-end', gap: 4 },
});
