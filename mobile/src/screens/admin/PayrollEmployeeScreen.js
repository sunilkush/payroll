import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { listPayrollApi, updatePayrollApi } from '../../api/endpoints';
import { Card, ErrorState, FormField, Header, Money, Notice, PrimaryButton, Screen, SkeletonList } from '../../components';
import { colors, fonts, radius, spacing, text } from '../../theme';
import { formatMoney } from '../../utils/format';
import { daysInMonth, otherCapOf, pfRateOf } from '../../utils/payroll';
import { daysBasisOf, periodLabel } from '../../utils/salary';

const COMPONENTS = [
  ['basic', 'Basic'],
  ['hra', 'HRA'],
  ['special', 'Special'],
  ['other', 'Other'],
];
const two = (value) => (Number(value) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatDays = (days) => (Number.isInteger(days) ? String(days) : days.toFixed(1));

function Tile({ value, label, tone, dark }) {
  return (
    <View style={[styles.tile, dark && styles.tileDark]}>
      <Text style={[styles.tileValue, tone && { color: colors[tone] }, dark && styles.onDark]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={[text.small, dark && styles.onDarkMuted]}>{label}</Text>
    </View>
  );
}

// Admin: ek staff ki draft payroll ki poori ginti; "Other" deduction aur remarks badal sakte hain (PATCH /payroll/:id).
// route.params: { month, id }
export default function PayrollEmployeeScreen({ navigation, route }) {
  const { month, id } = route.params;
  const [row, setRow] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [other, setOther] = useState('');
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoadError('');
    try {
      const res = await listPayrollApi(month);
      const found = res.data.rows.find((item) => item._id === id);
      if (!found) throw { message: 'This payroll row is no longer in the draft. Go back and refresh.' };
      setRow(found);
      setOther(found.deductions.other ? String(found.deductions.other) : '');
      setRemarks(found.remarks ?? '');
    } catch (err) {
      setLoadError(err.message);
    }
  };

  useEffect(() => {
    load();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!row) {
    return (
      <Screen>
        <Header title="Employee pay" onBack={navigation.goBack} />
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

  const { earnings, salaryStructure, deductions, attendance = {} } = row;
  const basis = daysBasisOf(row);
  const working = daysInMonth(month) - (attendance.weekOff ?? 0) - (attendance.holiday ?? 0);
  const cap = otherCapOf(row);
  const typed = Number(other) || 0;
  const over = typed > cap;
  const applied = Math.min(typed, cap);
  const net = Math.round((earnings.gross - deductions.pf - deductions.esi - applied) * 100) / 100;
  const pfRate = pfRateOf(row);
  const locked = row.status === 'FINAL';

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      await updatePayrollApi(id, { otherDeductions: applied, remarks: remarks.trim() });
      navigation.goBack();
    } catch (err) {
      setError(err.fields?.otherDeductions ?? err.message);
      setBusy(false);
    }
  };

  return (
    <Screen
      footer={
        locked ? undefined : (
          <>
            <Notice variant="danger">{error}</Notice>
            <PrimaryButton title="Save to draft" onPress={save} loading={busy} />
          </>
        )
      }
    >
      <Header title={row.staff?.name ?? 'Employee pay'} subtitle={`${row.staff?.employeeCode ?? ''} · ${periodLabel(month)}`} onBack={navigation.goBack} />

      <View style={styles.tiles}>
        <Tile value={String(working)} label="Working" />
        <Tile value={formatDays(attendance.present ?? 0)} label="Present" />
        <Tile value={formatDays(row.lopDays)} label="LOP" tone={row.lopDays > 0 ? 'warning' : undefined} />
        <Tile value={`${formatDays(row.payableDays)}/${basis}`} label="Payable" dark />
      </View>

      <Card padded={false}>
        <View style={styles.tableHead}>
          <Text style={[text.heading, styles.flex]}>Earnings</Text>
          <Text style={styles.colHead}>Monthly</Text>
          <Text style={styles.colHead}>Earned</Text>
        </View>
        {COMPONENTS.map(([key, label]) => (
          <View key={key} style={styles.tableRow}>
            <Text style={[text.body, styles.flex]}>{label}</Text>
            <Text style={styles.cell}>{two(salaryStructure?.[key])}</Text>
            <Text style={styles.cell}>{two(earnings[key])}</Text>
          </View>
        ))}
        <View style={[styles.tableRow, styles.totalRow]}>
          <Text style={[text.bodySemiBold, styles.flex]}>Gross</Text>
          <Text style={styles.cell}>{two(salaryStructure?.gross)}</Text>
          <Text style={[styles.cell, styles.bold]}>{two(earnings.gross)}</Text>
        </View>
      </Card>

      <Card>
        <Text style={text.heading}>Deductions</Text>
        <View style={styles.line}>
          <View style={styles.flex}>
            <Text style={text.body}>PF</Text>
            <Text style={text.small}>
              {deductions.pf > 0 ? `${pfRate ? `${pfRate}% of ` : 'On '}${formatMoney(row.pfWage)} wage` : 'Not applicable'}
            </Text>
          </View>
          <Text style={styles.cell}>{two(deductions.pf)}</Text>
        </View>
        <View style={styles.line}>
          <View style={styles.flex}>
            <Text style={text.body}>ESI</Text>
            <Text style={text.small}>{row.esiCovered ? 'On earned gross, rounded up' : 'Not applicable'}</Text>
          </View>
          <Text style={styles.cell}>{two(deductions.esi)}</Text>
        </View>
        <FormField
          label="Other (advance, fine, loan)"
          value={other}
          onChangeText={(value) => setOther(value.replace(/[^0-9.]/g, ''))}
          keyboardType="decimal-pad"
          mono
          placeholder="0"
          editable={!locked && !busy}
          error={over ? `Capped at ${formatMoney(cap)} so net pay never goes negative` : undefined}
          hint={`Max ${formatMoney(cap)} (earned gross − PF − ESI)`}
        />
        <FormField label="Remarks" value={remarks} onChangeText={setRemarks} placeholder="Shown on the salary slip" maxLength={200} editable={!locked && !busy} />
      </Card>

      <View style={styles.netCard}>
        <Text style={styles.netLabel}>Net pay</Text>
        <Money value={net} large style={styles.netAmount} />
        <Text style={styles.netMeta}>
          {formatMoney(earnings.gross)} − {formatMoney(deductions.pf + deductions.esi + applied)} deductions
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tiles: { flexDirection: 'row', gap: 8 },
  tile: { flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.card, padding: 10, gap: 2 },
  tileDark: { backgroundColor: colors.ink, borderColor: colors.ink },
  tileValue: { fontFamily: fonts.monoSemiBold, fontSize: 20, color: colors.ink },
  onDark: { color: colors.onInk },
  onDarkMuted: { color: colors.onInkMuted },
  tableHead: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: spacing.gapLg, paddingTop: spacing.gapLg, paddingBottom: 8 },
  colHead: { width: 92, textAlign: 'right', fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.muted },
  tableRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: spacing.gapLg, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.divider },
  totalRow: { backgroundColor: colors.paper },
  cell: { width: 92, textAlign: 'right', fontFamily: fonts.mono, fontSize: 14, color: colors.ink },
  bold: { fontFamily: fonts.monoSemiBold },
  line: { flexDirection: 'row', alignItems: 'center', gap: spacing.gap },
  netCard: { backgroundColor: colors.success, borderRadius: radius.hero, padding: spacing.gapLg, gap: 6 },
  netLabel: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.successTint },
  netAmount: { color: colors.onInk, fontSize: 34, lineHeight: 42 },
  netMeta: { fontFamily: fonts.mono, fontSize: 13, color: colors.successTint },
});
