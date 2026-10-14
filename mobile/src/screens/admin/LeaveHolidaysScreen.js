import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Card, EmptyState, ErrorState, Header, NumberStepper, Notice, PrimaryButton, Screen, SkeletonList, Toast, ToggleRow, useToast } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { useCompanySettings, useUnsavedGuard } from '../../hooks/useCompanySettings';
import { colors, fonts, radius, sizes, spacing, text } from '../../theme';
import { formatDateWithYear, todayStr } from '../../utils/format';

const DAYS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' },
];
const SETTING_KEYS = ['leaveEnabled', 'clPerMonth', 'elPerMonth', 'elCarryForwardMax', 'allowPastLeave', 'weekOffDays'];

const fromCompany = (company) => ({
  settings: Object.fromEntries(SETTING_KEYS.map((key) => [key, key === 'weekOffDays' ? [...company.settings.weekOffDays].sort() : company.settings[key]])),
});

// Admin: leave ka credit aur niyam, weekly off, paid holidays.
export default function LeaveHolidaysScreen({ navigation }) {
  const { hasFeature, reload: reloadSession } = useAuth();
  const leaveOnPlan = hasFeature('leave');
  const { company, error: loadError, reload, save } = useCompanySettings();
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast, hideToast] = useToast();

  useEffect(() => {
    if (company && !draft) setDraft(fromCompany(company));
  }, [company, draft]);

  // Holidays wali screen se wapas aane par list taaza (draft ki settings waisi hi rehti hain)
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const baseline = company ? fromCompany(company) : null;
  const changedKeys = draft ? SETTING_KEYS.filter((key) => JSON.stringify(draft.settings[key]) !== JSON.stringify(baseline.settings[key])) : [];
  useUnsavedGuard(changedKeys.length > 0 && !busy);

  if (!draft) {
    return (
      <Screen>
        <Header title="Leave & holidays" onBack={navigation.goBack} />
        {loadError ? <ErrorState message={loadError} onRetry={reload} /> : <SkeletonList rows={4} />}
      </Screen>
    );
  }

  const set = (key) => (value) => setDraft((previous) => ({ ...previous, settings: { ...previous.settings, [key]: value } }));
  const { settings } = draft;

  const toggleDay = (day) => {
    const has = settings.weekOffDays.includes(day);
    if (!has && settings.weekOffDays.length >= 6) return; // kam se kam ek kaam ka din
    set('weekOffDays')((has ? settings.weekOffDays.filter((item) => item !== day) : [...settings.weekOffDays, day]).sort());
  };

  // Holidays "Manage all" wali screen badalti hai; yahan sirf aane wali 5
  const upcoming = company.holidays.filter((item) => item.date >= todayStr()).slice(0, 5);

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      const saved = await save({ settings: Object.fromEntries(changedKeys.map((key) => [key, settings[key]])) });
      setDraft(fromCompany(saved));
      setToast('Leave & holidays saved.');
      if (changedKeys.includes('leaveEnabled')) reloadSession().catch(() => {});
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const credit = (value) => value.toFixed(2);

  return (
    <Screen
      overlay={<Toast message={toast} onHide={hideToast} />}
      footer={
        <>
          <Notice variant="danger">{error}</Notice>
          <PrimaryButton title="Save" onPress={submit} loading={busy} disabled={!changedKeys.length} />
        </>
      }
    >
      <Header title="Leave & holidays" onBack={navigation.goBack} />

      <Card padded={false}>
        <ToggleRow
          title="Leave management"
          subtitle={leaveOnPlan ? 'Staff apply for CL / EL in the app; balance is credited monthly' : 'Not included in your plan'}
          value={settings.leaveEnabled}
          onValueChange={set('leaveEnabled')}
          disabled={!leaveOnPlan && !settings.leaveEnabled}
        />
        <View style={[styles.row, styles.divider]}>
          <View style={styles.flex}>
            <Text style={text.bodyMedium}>Casual Leave (CL)</Text>
            <Text style={text.small}>Credited every month · lapses at year end</Text>
          </View>
          <NumberStepper value={settings.clPerMonth} onChange={set('clPerMonth')} step={0.25} min={0} max={10} format={credit} label="CL per month" />
        </View>
        <View style={[styles.row, styles.divider]}>
          <View style={styles.flex}>
            <Text style={text.bodyMedium}>Earned Leave (EL)</Text>
            <Text style={text.small}>Credited every month</Text>
          </View>
          <NumberStepper value={settings.elPerMonth} onChange={set('elPerMonth')} step={0.25} min={0} max={10} format={credit} label="EL per month" />
        </View>
        <View style={[styles.row, styles.divider]}>
          <View style={styles.flex}>
            <Text style={text.bodyMedium}>EL carry-forward limit</Text>
            <Text style={text.small}>Unused EL moved to next year, up to</Text>
          </View>
          <NumberStepper value={settings.elCarryForwardMax} onChange={set('elCarryForwardMax')} step={1} min={0} max={365} format={(value) => `${value} d`} label="EL carry-forward limit" />
        </View>
        <ToggleRow title="Allow leave for past dates" subtitle="For example, sick leave applied the next day" value={settings.allowPastLeave} onValueChange={set('allowPastLeave')} divider={false} />
      </Card>

      <View style={styles.group}>
        <Text style={styles.sectionTitle}>Weekly off</Text>
        <View style={styles.days}>
          {DAYS.map((day) => {
            const selected = settings.weekOffDays.includes(day.value);
            return (
              <Pressable key={day.value} style={[styles.day, selected && styles.daySelected]} onPress={() => toggleDay(day.value)} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} accessibilityLabel={`${day.label} weekly off`}>
                <Text style={[styles.dayText, selected && styles.onDark]}>{day.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.group}>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Paid holidays</Text>
          <Pressable style={styles.manage} onPress={() => navigation.navigate('Holidays')} accessibilityRole="link">
            <Text style={styles.manageText}>Manage all →</Text>
          </Pressable>
        </View>
        <Card padded={false}>
          {!upcoming.length ? (
            <EmptyState title="No upcoming holidays" message="Add the festivals and days your office is closed." />
          ) : (
            upcoming.map((item, index) => (
              <View key={item.date} style={[styles.row, index < upcoming.length - 1 && styles.divider]}>
                <Text style={styles.holidayDate}>{formatDateWithYear(item.date)}</Text>
                <Text style={[text.body, styles.flex]} numberOfLines={1}>
                  {item.name}
                </Text>
              </View>
            ))
          )}
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.gap, paddingHorizontal: spacing.gapLg, paddingVertical: 12 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  group: { gap: 8 },
  sectionTitle: { ...text.label, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 12 },
  days: { flexDirection: 'row', gap: 6 },
  day: { flex: 1, minHeight: sizes.touch, borderRadius: radius.input, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  daySelected: { backgroundColor: colors.ink, borderColor: colors.ink },
  dayText: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.ink },
  onDark: { color: colors.onInk },
  holidayDate: { fontFamily: fonts.mono, fontSize: 14, color: colors.ink, width: 96 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  manage: { minHeight: sizes.touch, justifyContent: 'center' },
  manageText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.success },
  delete: { width: sizes.touch, height: sizes.touch, alignItems: 'center', justifyContent: 'center' },
  addHoliday: {
    minHeight: sizes.touch + 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radius.card,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.inputBorder,
  },
});
