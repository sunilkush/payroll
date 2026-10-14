import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card, DarkCard, ErrorState, Header, NumberStepper, Notice, PickerField, PrimaryButton, Screen, SkeletonList, Toast, ToggleRow, useToast } from '../../components';
import { useCompanySettings, useUnsavedGuard } from '../../hooks/useCompanySettings';
import { colors, fonts, spacing, text } from '../../theme';
import { formatDuration } from '../../utils/format';

const KEYS = ['workTimeEnabled', 'workStartTime', 'workEndTime', 'requiredWorkMinutes', 'lunchBreakMinutes', 'halfDayCutoffTime', 'halfDayMinMinutes', 'lateGraceMin'];
const pick = (settings) => Object.fromEntries(KEYS.map((key) => [key, settings[key]]));
const minutes = (value) => formatDuration(value);
const plusMinutes = (time, add) => {
  const total = Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5)) + add;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

function StepRow({ title, subtitle, value, onChange, step, min, max, divider = true }) {
  return (
    <View style={[styles.row, divider && styles.divider]}>
      <View style={styles.flex}>
        <Text style={text.bodyMedium}>{title}</Text>
        {subtitle ? <Text style={text.small}>{subtitle}</Text> : null}
      </View>
      <NumberStepper value={value} onChange={onChange} step={step} min={min} max={max} format={minutes} label={title} />
    </View>
  );
}

// Admin: office ka time aur din kaise gina jata hai (server ke evaluatePunches ke niyam, inhi values se).
export default function WorkHoursScreen({ navigation }) {
  const { company, error: loadError, reload, save } = useCompanySettings();
  const [draft, setDraft] = useState(null);
  const [fields, setFields] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast, hideToast] = useToast();

  useEffect(() => {
    if (company && !draft) setDraft(pick(company.settings));
  }, [company, draft]);

  const baseline = company ? pick(company.settings) : null;
  const changed = draft ? KEYS.filter((key) => draft[key] !== baseline[key]) : [];
  useUnsavedGuard(changed.length > 0 && !busy);

  if (!draft) {
    return (
      <Screen>
        <Header title="Work hours & rules" onBack={navigation.goBack} />
        {loadError ? <ErrorState message={loadError} onRetry={reload} /> : <SkeletonList rows={4} />}
      </Screen>
    );
  }

  const set = (key) => (value) => {
    setDraft((previous) => ({ ...previous, [key]: value }));
    setFields((previous) => ({ ...previous, [`settings.${key}`]: undefined }));
  };

  const submit = async () => {
    if (draft.workEndTime <= draft.workStartTime) {
      setFields({ 'settings.workEndTime': 'End time must be after start time.' });
      return;
    }
    setBusy(true);
    setError('');
    try {
      const saved = await save({ settings: Object.fromEntries(changed.map((key) => [key, draft[key]])) });
      setDraft(pick(saved.settings));
      setToast('Work hours saved.');
    } catch (err) {
      setFields(err.fields);
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const { requiredWorkMinutes: required, halfDayCutoffTime: cutoff, halfDayMinMinutes: halfMin, lunchBreakMinutes: lunch } = draft;

  return (
    <Screen
      overlay={<Toast message={toast} onHide={hideToast} />}
      footer={
        <>
          <Notice variant="danger">{error}</Notice>
          <PrimaryButton title="Save" onPress={submit} loading={busy} disabled={!changed.length} />
        </>
      }
    >
      <Header title="Work hours & rules" onBack={navigation.goBack} />

      <Card padded={false}>
        <ToggleRow
          title="Track office timing"
          subtitle="Mark late arrivals and early exits, and allow punch-in only during office hours"
          value={draft.workTimeEnabled}
          onValueChange={set('workTimeEnabled')}
          divider={false}
        />
      </Card>

      <Card>
        <Text style={text.label}>Office timing</Text>
        <View style={styles.times}>
          <PickerField label="Starts" mode="time" value={draft.workStartTime} onChange={set('workStartTime')} error={fields['settings.workStartTime']} />
          <PickerField label="Ends" mode="time" value={draft.workEndTime} onChange={set('workEndTime')} error={fields['settings.workEndTime']} />
        </View>
        <PickerField label="Half-day cutoff" mode="time" value={cutoff} onChange={set('halfDayCutoffTime')} error={fields['settings.halfDayCutoffTime']} hint="Leaving before this time with short hours counts as absent" />
      </Card>

      <Card padded={false}>
        <StepRow title="Required net work" subtitle="For a full day (breaks excluded)" value={required} onChange={set('requiredWorkMinutes')} step={15} min={60} max={1440} />
        <StepRow title="Half-day minimum" subtitle="Least work for a half day" value={halfMin} onChange={set('halfDayMinMinutes')} step={15} min={0} max={1440} />
        <StepRow title="Lunch break" subtitle="Deducted if not punched out for it" value={lunch} onChange={set('lunchBreakMinutes')} step={5} min={0} max={180} />
        <StepRow title="Late arrival grace" subtitle={`In by ${plusMinutes(draft.workStartTime, draft.lateGraceMin)} is on time`} value={draft.lateGraceMin} onChange={set('lateGraceMin')} step={5} min={0} max={180} divider={false} />
      </Card>

      <DarkCard>
        <Text style={styles.explainTitle}>How a day is marked</Text>
        <Text style={styles.rule}>
          <Text style={styles.ruleName}>PRESENT</Text> · {minutes(required)} or more of net work.
        </Text>
        <Text style={styles.rule}>
          <Text style={styles.ruleName}>HALF DAY</Text> · Out at or after {cutoff} with {minutes(halfMin)} to {minutes(required)} of work.
        </Text>
        <Text style={styles.rule}>
          <Text style={styles.ruleName}>ABSENT</Text> · Out before {cutoff} with less than {minutes(required)}, or under {minutes(halfMin)} in total.
        </Text>
        <Text style={styles.rule}>
          <Text style={styles.ruleName}>PENDING</Text> · While punched in, or on a break before {cutoff}. Never half day while still working.
        </Text>
        <Text style={styles.ruleNote}>
          {draft.workTimeEnabled
            ? `On a shift of 5 hours or more, ${minutes(lunch)} of lunch is deducted if breaks taken are shorter. Lunch is never deducted twice.`
            : 'Lunch is deducted only when office timing is tracked. Lunch is never deducted twice.'}
        </Text>
      </DarkCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  times: { flexDirection: 'row', gap: spacing.gap },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.gap, paddingHorizontal: spacing.gapLg, paddingVertical: 12 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  explainTitle: { ...text.label, color: colors.onInkMuted, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 12 },
  rule: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.onInk },
  ruleName: { fontFamily: fonts.monoSemiBold, color: colors.successBright },
  ruleNote: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.onInkMuted },
});
