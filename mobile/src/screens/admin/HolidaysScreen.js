import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { CalendarHeart, Check, Copy, Plus } from 'lucide-react-native';
import { BottomSheet, Card, DateTile, EmptyState, ErrorState, Header, Notice, PrimaryButton, Screen, SecondaryButton, SkeletonList, Toast, useToast } from '../../components';
import { useCompanySettings } from '../../hooks/useCompanySettings';
import { colors, fonts, radius, sizes, spacing, text } from '../../theme';
import { branchesLabel, holidayTypeLabel, toHolidayPayload, weekdayOf, weekdayShort } from '../../utils/holiday';

// Admin: saal-wise paid holidays (company settings ki holidays list). Row dabane par edit.
export default function HolidaysScreen({ navigation }) {
  const { company, error: loadError, reload, save } = useCompanySettings();
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const [copyOpen, setCopyOpen] = useState(false);
  const [picked, setPicked] = useState([]);
  const [copying, setCopying] = useState(false);
  const [copyError, setCopyError] = useState('');
  const [toast, setToast, hideToast] = useToast();

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  if (!company) {
    return (
      <Screen>
        <Header title="Holidays" onBack={navigation.goBack} />
        {loadError ? <ErrorState message={loadError} onRetry={reload} /> : <SkeletonList rows={4} />}
      </Screen>
    );
  }

  const weekOff = company.settings.weekOffDays;
  const holidays = company.holidays;
  const years = [...new Set([thisYear, thisYear + 1, ...holidays.map((item) => Number(item.date.slice(0, 4)))])].sort();
  const shown = holidays.filter((item) => item.date.startsWith(`${year}-`));
  const nextYear = year + 1;
  const taken = new Set(holidays.map((item) => item.date));
  // Agle saal usi tarikh par (29 Feb jaise jo agle saal nahi hote, chhod do)
  const moved = (date) => {
    const target = `${nextYear}${date.slice(4)}`;
    const [y, m, d] = target.split('-').map(Number);
    const check = new Date(y, m - 1, d);
    return check.getMonth() === m - 1 ? target : null;
  };

  // National holidays (har saal usi tarikh) pehle se chuni hoti hain; baaki admin khud jod sakta hai.
  const openCopy = () => {
    setPicked(shown.filter((item) => item.type === 'NATIONAL' && moved(item.date) && !taken.has(moved(item.date))).map((item) => item.date));
    setCopyError('');
    setCopyOpen(true);
  };

  const copy = async () => {
    const additions = shown
      .filter((item) => picked.includes(item.date))
      .map((item) => toHolidayPayload({ ...item, date: moved(item.date) }))
      .filter((item) => item.date && !taken.has(item.date));
    if (!additions.length) {
      setCopyError('Those dates already have holidays next year.');
      return;
    }
    setCopying(true);
    setCopyError('');
    try {
      await save({ holidays: [...holidays.map(toHolidayPayload), ...additions] });
      setCopyOpen(false);
      setYear(nextYear);
      setToast(`${additions.length} holiday${additions.length > 1 ? 's' : ''} copied to ${nextYear}.`);
    } catch (err) {
      setCopyError(err.message);
    } finally {
      setCopying(false);
    }
  };

  return (
    <Screen overlay={<Toast message={toast} onHide={hideToast} />} onRefresh={reload}>
      <Header
        title="Holidays"
        onBack={navigation.goBack}
        right={
          <Pressable style={styles.add} onPress={() => navigation.navigate('HolidayForm', { year })} accessibilityRole="button">
            <Plus size={18} strokeWidth={2} color={colors.onInk} />
            <Text style={styles.addText}>Add</Text>
          </Pressable>
        }
      />

      <View style={styles.chips}>
        {years.map((item) => {
          const selected = item === year;
          const count = holidays.filter((holiday) => holiday.date.startsWith(`${item}-`)).length;
          return (
            <Pressable key={item} style={[styles.chip, selected && styles.chipSelected]} onPress={() => setYear(item)} accessibilityRole="tab" accessibilityState={{ selected }}>
              <Text style={[styles.chipText, selected && styles.onDark]}>
                {item} <Text style={styles.mono}>{count}</Text>
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Card padded={false}>
        {!shown.length ? (
          <EmptyState icon={CalendarHeart} title={`No holidays in ${year}`} message="Add the festivals and days your office is closed." />
        ) : (
          shown.map((item, index) => {
            const onWeekOff = weekOff.includes(weekdayOf(item.date));
            return (
              <Pressable
                key={item.date}
                style={({ pressed }) => [styles.row, index < shown.length - 1 && styles.divider, pressed && styles.pressed]}
                onPress={() => navigation.navigate('HolidayForm', { date: item.date })}
                accessibilityRole="button"
              >
                <DateTile date={item.date} tone={onWeekOff ? 'warning' : 'neutral'} />
                <View style={styles.flex}>
                  <Text style={text.bodyMedium}>{item.name}</Text>
                  <Text style={[text.small, onWeekOff && styles.warn]}>
                    {weekdayShort(item.date)} · {holidayTypeLabel(item.type)} · {branchesLabel(item, company.locations)}
                    {onWeekOff ? ' · on a weekly off' : ''}
                  </Text>
                </View>
              </Pressable>
            );
          })
        )}
      </Card>

      <Notice variant="info">Changes only affect months that aren't finalized yet. Locked payroll keeps the holidays it was made with.</Notice>
      {shown.length > 0 && <SecondaryButton title={`Copy fixed-date holidays to ${nextYear}`} icon={Copy} onPress={openCopy} />}

      <BottomSheet visible={copyOpen} onClose={() => setCopyOpen(false)} title={`Copy to ${nextYear}`}>
        <Text style={text.small}>National holidays (same date every year) are already ticked. Festivals that move with the calendar need a new date, so add those yourself.</Text>
        <Card padded={false}>
          {shown.map((item, index) => {
            const target = moved(item.date);
            const exists = !target || taken.has(target);
            const checked = picked.includes(item.date);
            return (
              <Pressable
                key={item.date}
                style={[styles.row, index < shown.length - 1 && styles.divider, exists && styles.disabled]}
                onPress={() => !exists && setPicked((previous) => (checked ? previous.filter((date) => date !== item.date) : [...previous, item.date]))}
                disabled={exists}
                accessibilityRole="checkbox"
                accessibilityState={{ checked, disabled: exists }}
              >
                <View style={[styles.box, checked && styles.boxChecked]}>{checked && <Check size={14} strokeWidth={3} color={colors.onInk} />}</View>
                <View style={styles.flex}>
                  <Text style={text.bodyMedium}>{item.name}</Text>
                  <Text style={text.small}>{exists ? `Already on ${nextYear} list` : `→ ${target ? `${weekdayShort(target)} ${target.slice(8)}/${target.slice(5, 7)}/${nextYear}` : ''}`}</Text>
                </View>
              </Pressable>
            );
          })}
        </Card>
        <Notice variant="danger">{copyError}</Notice>
        <PrimaryButton title={picked.length ? `Copy ${picked.length} to ${nextYear}` : `Copy to ${nextYear}`} onPress={copy} loading={copying} disabled={!picked.length} />
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  add: { minHeight: sizes.touch, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, borderRadius: radius.pill, backgroundColor: colors.ink },
  addText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.onInk },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: sizes.touch, justifyContent: 'center', paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: colors.neutralTint },
  chipSelected: { backgroundColor: colors.ink },
  chipText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.neutral },
  onDark: { color: colors.onInk },
  mono: { fontFamily: fonts.mono },
  row: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: spacing.gap, paddingHorizontal: spacing.gapLg, paddingVertical: 10 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  pressed: { backgroundColor: colors.paper },
  warn: { color: colors.warning },
  disabled: { opacity: 0.5 },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.inputBorder, alignItems: 'center', justifyContent: 'center' },
  boxChecked: { backgroundColor: colors.success, borderColor: colors.success },
});
