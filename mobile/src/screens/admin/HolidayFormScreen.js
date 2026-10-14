import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Trash } from 'lucide-react-native';
import { Card, ErrorState, FormField, Header, MonthCalendar, Notice, PrimaryButton, Screen, SegmentedControl, SkeletonList } from '../../components';
import { useCompanySettings, useUnsavedGuard } from '../../hooks/useCompanySettings';
import { colors, fonts, radius, sizes, spacing, text } from '../../theme';
import { formatDateWithYear } from '../../utils/format';
import { HOLIDAY_TYPES, isMonthFinalized, toHolidayPayload, weekdayName, weekdayOf } from '../../utils/holiday';
import { periodLabel } from '../../utils/salary';

const pad = (value) => String(value).padStart(2, '0');

// Admin: holiday jodna / badalna / hatana (PUT /settings, poori holidays list).
// route.params: { date? (edit: purani tarikh), year? (naye ke liye shuru ka saal) }
export default function HolidayFormScreen({ navigation, route }) {
  const original = route.params?.date ?? null;
  const { company, error: loadError, reload, save } = useCompanySettings();
  const [name, setName] = useState('');
  const [date, setDate] = useState(() => {
    if (original) return original;
    const now = new Date();
    const year = route.params?.year ?? now.getFullYear();
    return year === now.getFullYear() ? `${year}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` : `${year}-01-01`;
  });
  const [type, setType] = useState('COMPANY');
  const [branchIds, setBranchIds] = useState([]); // khali = saari branches
  const [ready, setReady] = useState(!original);
  const [fields, setFields] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  // Edit: purani holiday ki details bharo
  useEffect(() => {
    if (!company || ready) return;
    const existing = company.holidays.find((item) => item.date === original);
    if (existing) {
      setName(existing.name);
      setType(existing.type ?? 'COMPANY');
      setBranchIds((existing.branchIds ?? []).map(String));
    }
    setReady(true);
  }, [company, original, ready]);

  const existing = original ? company?.holidays.find((item) => item.date === original) : null;
  const changed = original
    ? name !== (existing?.name ?? '') ||
      date !== original ||
      type !== (existing?.type ?? 'COMPANY') ||
      JSON.stringify([...branchIds].sort()) !== JSON.stringify((existing?.branchIds ?? []).map(String).sort())
    : name.trim().length > 0;
  useUnsavedGuard(ready && !done && !busy && changed);

  if (!company || !ready) {
    return (
      <Screen>
        <Header title={original ? 'Edit holiday' : 'Add holiday'} onBack={navigation.goBack} />
        {loadError ? <ErrorState message={loadError} onRetry={reload} /> : <SkeletonList rows={3} />}
      </Screen>
    );
  }

  const weekOff = company.settings.weekOffDays;
  const onWeekOff = weekOff.includes(weekdayOf(date));
  const others = company.holidays.filter((item) => item.date !== original);
  const duplicate = others.find((item) => item.date === date);
  const marked = Object.fromEntries(others.map((item) => [item.date, true]));

  // Jis mahine ki payroll lock hai uski holiday nahi badal sakte (salary pehle hi us hisaab se bani).
  const lockedMonth = async () => {
    const months = [...new Set([date.slice(0, 7), original?.slice(0, 7)].filter(Boolean))];
    for (const month of months) if (await isMonthFinalized(month)) return month;
    return null;
  };

  const persist = async (list, message) => {
    setBusy(true);
    setError('');
    try {
      const locked = await lockedMonth();
      if (locked) throw { message: `${periodLabel(locked)} payroll is finalized, so its holidays can't be changed.` };
      await save({ holidays: list });
      setDone(true);
      // "Unsaved changes" guard pehle hat jaye (agle render mein), phir wapas
      setTimeout(() => navigation.goBack(), 0);
      return message;
    } catch (err) {
      setError(err.message);
      setBusy(false);
      return null;
    }
  };

  const submit = () => {
    const problems = {};
    if (name.trim().length < 2) problems.name = 'Enter the holiday name.';
    setFields(problems);
    if (Object.keys(problems).length) return;
    if (duplicate) {
      setError(`${formatDateWithYear(date)} is already a holiday (${duplicate.name}).`);
      return;
    }
    // Baaki holidays apne type / branches ke saath hi jaati hain (PUT poori list badalta hai)
    persist([...others.map(toHolidayPayload), { date, name: name.trim(), type, branchIds }]);
  };

  const remove = () => {
    Alert.alert('Delete this holiday?', `${existing?.name ?? 'This holiday'} on ${formatDateWithYear(original)} will become a normal working day.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => persist(others.map(toHolidayPayload)) },
    ]);
  };

  const toggleBranch = (id) => setBranchIds((previous) => (previous.includes(id) ? previous.filter((item) => item !== id) : [...previous, id]));
  const branches = company.locations;

  return (
    <Screen
      footer={
        <>
          <Notice variant="danger">{error}</Notice>
          <View style={styles.footer}>
            {original && (
              <Pressable style={styles.delete} onPress={remove} disabled={busy} accessibilityRole="button" accessibilityLabel="Delete holiday">
                <Trash size={22} strokeWidth={2} color={colors.onInk} />
              </Pressable>
            )}
            <PrimaryButton title="Save" onPress={submit} loading={busy} style={styles.flex} />
          </View>
        </>
      }
    >
      <Header title={original ? 'Edit holiday' : 'Add holiday'} onBack={navigation.goBack} />

      <FormField
        label="Name"
        value={name}
        onChangeText={(value) => {
          setName(value);
          setFields({});
        }}
        error={fields.name}
        placeholder="Diwali"
        maxLength={100}
        editable={!busy}
      />

      <Card>
        <MonthCalendar
          value={date}
          onChange={(value) => {
            setDate(value);
            setError('');
          }}
          mutedDays={weekOff}
          marked={marked}
        />
        <Text style={[styles.feedback, duplicate ? styles.danger : onWeekOff ? styles.warning : styles.success]}>
          {duplicate
            ? `Already a holiday: ${duplicate.name}`
            : onWeekOff
              ? `${weekdayName(date)} is already a weekly off, so this holiday gives no extra day off.`
              : `${weekdayName(date)}, ${formatDateWithYear(date)} · paid day off for staff`}
        </Text>
      </Card>

      <View style={styles.group}>
        <Text style={text.label}>Type</Text>
        <SegmentedControl options={HOLIDAY_TYPES} value={type} onChange={setType} />
        <Text style={text.small}>National holidays fall on the same date every year and can be copied to next year in one tap.</Text>
      </View>

      <View style={styles.group}>
        <Text style={text.label}>Applies to</Text>
        <View style={styles.chips}>
          <Pressable
            style={[styles.chip, !branchIds.length && styles.chipSelected]}
            onPress={() => setBranchIds([])}
            accessibilityRole="radio"
            accessibilityState={{ selected: !branchIds.length }}
          >
            <Text style={[styles.chipText, !branchIds.length && styles.chipTextSelected]}>All branches</Text>
          </Pressable>
          {branches.map((branch) => {
            const selected = branchIds.includes(String(branch._id));
            return (
              <Pressable
                key={branch._id}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => toggleBranch(String(branch._id))}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected }}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{branch.name}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={text.small}>
          {branchIds.length ? 'Only staff of the chosen branches get this day off (set each staff member’s branch in Staff).' : 'Every staff member gets this day off.'}{' '}
          Holidays are paid and never count as absent or LOP.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  footer: { flexDirection: 'row', gap: spacing.gap },
  delete: { width: sizes.button, height: sizes.button, borderRadius: sizes.button / 2, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' },
  feedback: { fontFamily: fonts.bodyMedium, fontSize: 14, lineHeight: 20 },
  group: { gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: sizes.touch, justifyContent: 'center', paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.inputBorder, backgroundColor: colors.card },
  chipSelected: { borderColor: colors.success, backgroundColor: colors.successTint },
  chipText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.ink },
  chipTextSelected: { fontFamily: fonts.bodySemiBold, color: colors.successDark },
  success: { color: colors.success },
  warning: { color: colors.warning },
  danger: { color: colors.danger },
});
