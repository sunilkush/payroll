import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Check, Lock } from 'lucide-react-native';
import { cancelUpgradeApi, getBillingApi, getPlansApi, requestUpgradeApi } from '../../api/endpoints';
import { Card, DarkCard, ErrorState, Header, Notice, Pill, PrimaryButton, ProgressBar, Screen, SecondaryButton, SkeletonList, Toast, useToast } from '../../components';
import { colors, fonts, radius, spacing, text } from '../../theme';
import { formatDateWithYear, formatMoney } from '../../utils/format';

// Admin: chalu plan, staff ki hadd, aur bade plan ki request (platform team manzoor karti hai).
export default function PlanBillingScreen({ navigation }) {
  const [state, setState] = useState({ billing: null, catalog: null, error: '' });
  const [chosen, setChosen] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast, hideToast] = useToast();

  const load = useCallback(async () => {
    try {
      const [billing, plans] = await Promise.all([getBillingApi(), getPlansApi()]);
      setState({ billing: billing.data, catalog: plans.data, error: '' });
    } catch (err) {
      setState((previous) => ({ ...previous, error: err.message }));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const { billing, catalog } = state;
  if (!billing || !catalog) {
    return (
      <Screen>
        <Header title="Plan & billing" onBack={navigation.goBack} />
        {state.error ? (
          <Card>
            <ErrorState message={state.error} onRetry={load} />
          </Card>
        ) : (
          <SkeletonList rows={3} />
        )}
      </Screen>
    );
  }

  const current = catalog.plans.find((plan) => plan.code === billing.plan);
  const locked = Object.keys(catalog.featureLabels).filter((feature) => !billing.features.includes(feature));
  const pending = billing.request?.status === 'PENDING' ? billing.request : null;
  const choices = catalog.plans.filter((plan) => plan.code !== 'FREE');
  const selected = choices.find((plan) => plan.code === chosen);
  const { subscription } = billing;

  const request = async () => {
    setBusy(true);
    setError('');
    try {
      await requestUpgradeApi(chosen, '');
      setToast('Upgrade request sent.');
      setChosen(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    setBusy(true);
    setError('');
    try {
      await cancelUpgradeApi();
      setToast('Request cancelled.');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const price = (plan) => {
    const quote = billing.quotes?.[plan.code];
    if (plan.monthlyPrice == null) return 'Custom price';
    return `${formatMoney(plan.monthlyPrice)} / month${quote ? ` · billed ${quote.months} months + ${quote.gstPercent}% GST` : ''}`;
  };

  return (
    <Screen
      overlay={<Toast message={toast} onHide={hideToast} />}
      footer={
        pending ? undefined : (
          <>
            <Notice variant="danger">{error}</Notice>
            <PrimaryButton title={selected ? `Request ${selected.name} upgrade` : 'Choose a plan'} onPress={request} loading={busy} disabled={!selected} />
          </>
        )
      }
    >
      <Header title="Plan & billing" onBack={navigation.goBack} />

      <DarkCard>
        <View style={styles.top}>
          <Text style={styles.onDarkLabel}>Current plan</Text>
          <Pill variant="success">{(current?.name ?? billing.plan).toUpperCase()}</Pill>
        </View>
        <Text style={styles.usage}>
          <Text style={styles.mono}>{billing.activeStaff}</Text> / <Text style={styles.mono}>{billing.staffLimit ?? '∞'}</Text> active staff
        </Text>
        {billing.staffLimit != null && <ProgressBar value={billing.activeStaff / billing.staffLimit} tone={billing.activeStaff >= billing.staffLimit ? 'danger' : 'successBright'} />}
        {subscription?.endsAt && (
          <Text style={styles.onDarkSmall}>
            {subscription.status === 'TRIAL' ? 'Free trial ends' : subscription.status === 'EXPIRED' ? 'Ended' : 'Paid until'} {formatDateWithYear(subscription.endsAt)}
          </Text>
        )}
        {locked.length > 0 && (
          <View style={styles.lockedChips}>
            {locked.map((feature) => (
              <View key={feature} style={styles.lockedChip}>
                <Lock size={12} strokeWidth={2} color={colors.onInkMuted} />
                <Text style={styles.lockedText}>{catalog.featureLabels[feature]}</Text>
              </View>
            ))}
          </View>
        )}
      </DarkCard>

      {pending ? (
        <Card>
          <View style={styles.top}>
            <Text style={text.bodySemiBold}>{catalog.plans.find((plan) => plan.code === pending.plan)?.name ?? pending.plan} requested</Text>
            <Pill variant="warning">Pending review</Pill>
          </View>
          <Text style={text.small}>Sent {formatDateWithYear(pending.requestedAt)}. The platform team will contact you to complete the upgrade.</Text>
          <Notice variant="danger">{error}</Notice>
          <SecondaryButton title="Cancel request" danger onPress={cancel} loading={busy} />
        </Card>
      ) : (
        <View style={styles.group}>
          <Text style={styles.sectionTitle}>Choose a plan</Text>
          {billing.request?.status === 'REJECTED' && (
            <Notice variant="danger">Your last request was not approved.{billing.request.decisionNote ? ` ${billing.request.decisionNote}` : ''}</Notice>
          )}
          {choices.map((plan) => {
            const allowed = billing.canChoose?.[plan.code];
            const isSelected = chosen === plan.code;
            const isCurrent = plan.code === billing.plan;
            return (
              <Pressable
                key={plan.code}
                onPress={() => allowed && setChosen(plan.code)}
                disabled={!allowed}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected, disabled: !allowed }}
              >
                <Card style={[isSelected && styles.selected, !allowed && styles.unavailable]}>
                  <View style={styles.top}>
                    <Text style={text.heading}>{plan.name}</Text>
                    {isCurrent ? <Pill variant="info">Your plan</Pill> : isSelected ? <Check size={20} strokeWidth={2.5} color={colors.success} /> : null}
                  </View>
                  <Text style={styles.price}>{price(plan)}</Text>
                  <Text style={text.small}>
                    {plan.staffLimit ? `Up to ${plan.staffLimit} active staff` : 'Unlimited staff'}
                    {plan.features.length ? ` · ${plan.features.map((feature) => catalog.featureLabels[feature]).join(', ')}` : ''}
                  </Text>
                </Card>
              </Pressable>
            );
          })}
          <Text style={text.small}>Upgrade requests are reviewed by the platform team. Nothing is charged in the app.</Text>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.gap },
  onDarkLabel: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.onInkMuted },
  usage: { fontFamily: fonts.bodySemiBold, fontSize: 20, color: colors.onInk },
  mono: { fontFamily: fonts.monoSemiBold },
  onDarkSmall: { fontFamily: fonts.body, fontSize: 13, color: colors.onInkMuted },
  lockedChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  lockedChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.08)' },
  lockedText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.onInkMuted },
  group: { gap: spacing.gap },
  sectionTitle: { ...text.label, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 12 },
  selected: { borderColor: colors.success, borderWidth: 2 },
  unavailable: { opacity: 0.5 },
  price: { fontFamily: fonts.mono, fontSize: 14, color: colors.ink },
});
