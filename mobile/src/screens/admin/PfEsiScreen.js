import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card, ErrorState, Header, ListRow, Notice, PrimaryButton, Screen, SkeletonList, Toast, ToggleRow, useToast } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { useCompanySettings, useUnsavedGuard } from '../../hooks/useCompanySettings';
import { spacing, text } from '../../theme';

const KEYS = ['pfEnabled', 'pfCapAtCeiling', 'esiEnabled'];
const pick = (settings) => Object.fromEntries(KEYS.map((key) => [key, settings[key]]));

// Ye rates poore platform ke hain (Super Admin ki Global Settings). Admin ko API mein nahi milte, isliye yahan
// aam (default) rates likhe hain; Super Admin ne badle hon to payroll unhi badle hue rates se banti hai.
const PF_ROWS = [
  ['PF wage', 'Higher of Basic or 50% of gross'],
  ['Employee', '12% of PF wage'],
  ['Employer EPS', '8.33%, max ₹1,250'],
  ['Employer EPF', 'Rest of employer 12%'],
  ['EDLI + admin', '0.5% + 0.5%'],
];
const ESI_ROWS = [
  ['Applies when', 'Monthly gross ≤ ₹21,000'],
  ['Employee', '0.75% (rounded up)'],
  ['Employer', '3.25% (rounded up)'],
];

// Admin: PF aur ESI chalu / band, aur PF wage ki ceiling.
export default function PfEsiScreen({ navigation }) {
  const { hasFeature } = useAuth();
  const onPlan = hasFeature('statutory');
  const { company, error: loadError, reload, save } = useCompanySettings();
  const [draft, setDraft] = useState(null);
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
        <Header title="PF & ESI" onBack={navigation.goBack} />
        {loadError ? <ErrorState message={loadError} onRetry={reload} /> : <SkeletonList rows={3} />}
      </Screen>
    );
  }

  const set = (key) => (value) => setDraft((previous) => ({ ...previous, [key]: value }));

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      const saved = await save({ settings: Object.fromEntries(changed.map((key) => [key, draft[key]])) });
      setDraft(pick(saved.settings));
      setToast('PF & ESI saved. New payroll drafts will use it.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

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
      <Header title="PF & ESI" onBack={navigation.goBack} />
      {!onPlan && <Notice variant="warning">PF & ESI are not included in your plan. Upgrade to turn them on.</Notice>}

      <Card padded={false}>
        <ToggleRow title="EPF (Provident Fund)" subtitle="Applies to staff marked PF applicable" value={draft.pfEnabled} onValueChange={set('pfEnabled')} disabled={!onPlan && !draft.pfEnabled} />
        <ToggleRow title="Cap PF wage at ₹15,000" subtitle="Off: PF on the actual PF wage" value={draft.pfCapAtCeiling} onValueChange={set('pfCapAtCeiling')} disabled={!draft.pfEnabled} />
        {PF_ROWS.map(([title, value], index) => (
          <ListRow key={title} title={title} value={value} mono={false} divider={index < PF_ROWS.length - 1} />
        ))}
      </Card>

      <Card padded={false}>
        <ToggleRow title="ESI" subtitle="Applies to staff marked ESI applicable" value={draft.esiEnabled} onValueChange={set('esiEnabled')} disabled={!onPlan && !draft.esiEnabled} />
        {ESI_ROWS.map(([title, value], index) => (
          <ListRow key={title} title={title} value={value} mono={false} divider={index < ESI_ROWS.length - 1} />
        ))}
      </Card>

      <Notice variant="info">
        ESI works in 6-month contribution periods (Apr–Sep, Oct–Mar). Once ESI is deducted for someone in a period, it continues until the period ends, even if their pay goes above the limit.
      </Notice>

      <View style={styles.foot}>
        <Text style={text.small}>
          Rates and ceilings are set for the whole platform by the Super Admin and are read-only here. The values above are the standard rates;
          if the Super Admin changes them, payroll uses the changed rates.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  foot: { gap: spacing.gap },
});
