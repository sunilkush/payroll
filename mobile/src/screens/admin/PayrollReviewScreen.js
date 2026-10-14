import { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Check, FileText, Lock, Send } from 'lucide-react-native';
import { finalizePayrollApi, generatePayrollApi, listPayrollApi } from '../../api/endpoints';
import { BottomSheet, Card, DarkCard, ErrorState, Header, ListRow, Money, Notice, Pill, PrimaryButton, Screen, SecondaryButton, SkeletonList, Stepper } from '../../components';
import { colors, fonts, radius, sizes, spacing, text } from '../../theme';
import { formatDate, formatMoney, formatTime } from '../../utils/format';
import { monthName } from '../../utils/payroll';
import { daysBasisOf, periodLabel } from '../../utils/salary';

const STEPS = ['Generated', 'Review draft', 'Finalize & lock'];
const formatDays = (days) => (Number.isInteger(days) ? String(days) : days.toFixed(1));

function Checkbox({ checked, onChange, label }) {
  return (
    <Pressable style={styles.checkRow} onPress={() => onChange(!checked)} accessibilityRole="checkbox" accessibilityState={{ checked }}>
      <View style={[styles.box, checked && styles.boxChecked]}>{checked && <Check size={16} strokeWidth={3} color={colors.onInk} />}</View>
      <Text style={[text.bodyMedium, styles.flex]}>{label}</Text>
    </Pressable>
  );
}

// Admin: draft payroll dekhna, kisi ki row kholna, dobara banana aur finalize. route.params.month
export default function PayrollReviewScreen({ navigation, route }) {
  const { month } = route.params;
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [recalculating, setRecalculating] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [finalizeError, setFinalizeError] = useState('');
  const sending = useRef(false); // do baar tap par do request nahi

  const load = useCallback(async () => {
    setLoadError('');
    try {
      const res = await listPayrollApi(month);
      // Sab final ho chuka (jaise doosre phone se): seedha locked
      if (res.data.rows.length && !res.data.hasDraft) {
        navigation.replace('PayrollLocked', { month });
        return;
      }
      setData(res.data);
    } catch (err) {
      setLoadError(err.message);
    }
  }, [month, navigation]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const recalculate = async () => {
    setRecalculating(true);
    setError('');
    try {
      const res = await generatePayrollApi(month);
      setData(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setRecalculating(false);
    }
  };

  const finalize = async () => {
    if (sending.current) return;
    sending.current = true;
    setFinalizing(true);
    setFinalizeError('');
    try {
      await finalizePayrollApi(month);
      setSheet(false);
      navigation.replace('PayrollLocked', { month, justLocked: true });
    } catch (err) {
      setFinalizeError(err.message);
      sending.current = false;
      setFinalizing(false);
    }
  };

  if (!data) {
    return (
      <Screen>
        <Header title={periodLabel(month)} onBack={navigation.goBack} />
        {loadError ? (
          <Card>
            <ErrorState message={loadError} onRetry={load} />
          </Card>
        ) : (
          <SkeletonList rows={4} />
        )}
      </Screen>
    );
  }

  const { rows, totals } = data;
  const generatedAt = rows.reduce((latest, row) => (row.updatedAt > (latest ?? '') ? row.updatedAt : latest), null);
  const basis = rows.length ? daysBasisOf(rows[0]) : 30;
  const zeroNet = rows.filter((row) => row.netSalary <= 0);
  const noBank = rows.filter((row) => !row.staff?.accountNo || !row.staff?.ifsc);
  const withLop = rows.filter((row) => row.lopDays > 0);

  return (
    <Screen
      footer={
        <View style={styles.footer}>
          <SecondaryButton title="Recalculate" onPress={recalculate} loading={recalculating} style={styles.flex} />
          <PrimaryButton
            title="Review & finalize"
            onPress={() => {
              setReviewed(false);
              setFinalizeError('');
              setSheet(true);
            }}
            disabled={!data.monthCompleted || !rows.length}
            style={[styles.flex, styles.green]}
          />
        </View>
      }
    >
      <Header
        title={periodLabel(month)}
        subtitle={`Generated ${generatedAt ? `${formatDate(generatedAt)} ${formatTime(generatedAt)}` : ''} · ${basis}-day basis`}
        onBack={navigation.goBack}
        right={<Pill variant="warning">Draft</Pill>}
      />
      <Stepper steps={STEPS} current={1} />

      <DarkCard>
        <Text style={styles.onDarkLabel}>
          Net payable · {rows.length} staff
        </Text>
        <Money value={totals.netSalary} large style={styles.net} />
        <View style={styles.figures}>
          {[
            ['Earned gross', totals.earnedGross],
            ['PF + ESI', totals.pf + totals.esi],
            ['Other ded.', totals.other],
          ].map(([label, value]) => (
            <View key={label} style={styles.figure}>
              <Text style={styles.onDarkSmall}>{label}</Text>
              <Money value={value} style={styles.onDarkMono} />
            </View>
          ))}
        </View>
      </DarkCard>

      {!data.monthCompleted && <Notice variant="warning">{monthName(month)} is not over yet. You can review the draft now and finalize after the month ends.</Notice>}
      {zeroNet.length > 0 && <Notice variant="warning">{zeroNet.length} staff get ₹0 this month ({zeroNet.map((row) => row.staff?.name).join(', ')}). Check their attendance and salary.</Notice>}
      {noBank.length > 0 && <Notice variant="warning">{noBank.length} staff have no bank details and will be left out of the bank transfer sheet.</Notice>}
      <Notice variant="danger">{error}</Notice>

      <Text style={styles.sectionTitle}>Tap a row to check or edit</Text>
      <Card padded={false}>
        {rows.map((row, index) => {
          const info = [
            row.lopDays > 0 && `${formatDays(row.lopDays)} LOP`,
            `${formatDays(row.payableDays)} payable`,
            row.esiCovered ? 'ESI' : row.deductions.pf > 0 ? 'PF' : null,
          ]
            .filter(Boolean)
            .join(' · ');
          return (
            <ListRow
              key={row._id}
              title={row.staff?.name ?? 'Staff'}
              subtitle={info}
              subtitleTone={row.lopDays > 0 ? 'warning' : undefined}
              right={<Money value={row.netSalary} />}
              onPress={() => navigation.navigate('PayrollEmployee', { month, id: row._id })}
              divider={index < rows.length - 1}
            />
          );
        })}
      </Card>
      {withLop.length > 0 && <Text style={text.small}>{withLop.length} staff have loss-of-pay days. "Recalculate" picks up attendance changes and keeps the deductions you entered.</Text>}

      <BottomSheet visible={sheet} onClose={() => !finalizing && setSheet(false)} title={`Finalize ${monthName(month)}?`}>
        <Text style={styles.danger}>This can't be undone.</Text>
        <Card padded={false}>
          <ListRow title="Employees" value={String(rows.length)} />
          <ListRow title="Earned gross" value={formatMoney(totals.earnedGross)} />
          <ListRow title="Deductions" value={formatMoney(totals.deductions)} />
          <ListRow title="Net to pay" right={<Money value={totals.netSalary} style={styles.bold} />} divider={false} />
        </Card>
        <View style={styles.consequences}>
          <View style={styles.consequence}>
            <Lock size={18} strokeWidth={2} color={colors.ink} />
            <Text style={[text.body, styles.flex]}>Locks {periodLabel(month)}: amounts and attendance can no longer be changed.</Text>
          </View>
          <View style={styles.consequence}>
            <Send size={18} strokeWidth={2} color={colors.ink} />
            <Text style={[text.body, styles.flex]}>Publishes {rows.length} salary slips to your staff's app.</Text>
          </View>
          <View style={styles.consequence}>
            <FileText size={18} strokeWidth={2} color={colors.ink} />
            <Text style={[text.body, styles.flex]}>Keeps a snapshot of every slip as it is today.</Text>
          </View>
        </View>
        <Checkbox checked={reviewed} onChange={setReviewed} label="I've reviewed every employee's pay" />
        <Notice variant="danger">{finalizeError}</Notice>
        <PrimaryButton title={`Finalize ${monthName(month)}`} onPress={finalize} loading={finalizing} disabled={!reviewed} style={reviewed && styles.green} />
        <SecondaryButton title="Back to review" onPress={() => setSheet(false)} disabled={finalizing} />
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  footer: { flexDirection: 'row', gap: spacing.gap },
  green: { backgroundColor: colors.success },
  onDarkLabel: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.onInkMuted },
  net: { color: colors.onInk, fontSize: 36, lineHeight: 44 },
  figures: { flexDirection: 'row', gap: spacing.gap },
  figure: { flex: 1, gap: 2 },
  onDarkSmall: { fontFamily: fonts.body, fontSize: 12, color: colors.onInkMuted },
  onDarkMono: { fontFamily: fonts.mono, fontSize: 14, color: colors.onInk },
  sectionTitle: { ...text.label, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 12 },
  danger: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.danger },
  bold: { fontFamily: fonts.monoSemiBold },
  consequences: { gap: spacing.gap },
  consequence: { flexDirection: 'row', gap: spacing.gap, alignItems: 'flex-start' },
  checkRow: { minHeight: sizes.touch, flexDirection: 'row', alignItems: 'center', gap: spacing.gap },
  box: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: colors.inputBorder, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
  boxChecked: { backgroundColor: colors.success, borderColor: colors.success },
});
