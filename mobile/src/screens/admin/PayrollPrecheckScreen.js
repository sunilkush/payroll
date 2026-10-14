import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { CircleAlert, CircleCheck, Info } from 'lucide-react-native';
import { generatePayrollApi, listCorrectionsApi, listLeavesApi, listStaffApi } from '../../api/endpoints';
import { Card, ErrorState, Header, Notice, PrimaryButton, Screen, SkeletonList, StatTile } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { colors, fonts, sizes, spacing, text } from '../../theme';
import { currentMonth } from '../../utils/format';
import { daysInMonth, monthRangeLabel } from '../../utils/payroll';
import { periodLabel } from '../../utils/salary';

const ICON = {
  ok: { Icon: CircleCheck, color: colors.success },
  warn: { Icon: CircleAlert, color: colors.warning },
  info: { Icon: Info, color: colors.muted },
};

function CheckRow({ kind, title, detail, action, onAction, divider }) {
  const { Icon, color } = ICON[kind];
  return (
    <View style={[styles.check, divider && styles.divider]}>
      <Icon size={20} strokeWidth={2} color={color} />
      <View style={styles.flex}>
        <Text style={text.bodyMedium}>{title}</Text>
        {detail ? <Text style={text.small}>{detail}</Text> : null}
      </View>
      {action && (
        <Pressable style={styles.action} onPress={onAction} accessibilityRole="link">
          <Text style={styles.actionText}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

// Admin: payroll banane se pehle ki jaanch. route.params.month: 'YYYY-MM'
export default function PayrollPrecheckScreen({ navigation, route }) {
  const { month } = route.params;
  const { hasFeature } = useAuth();
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoadError('');
    try {
      const [staff, corrections, leaves] = await Promise.all([
        listStaffApi({ status: 'all', limit: 100 }),
        hasFeature('corrections') ? listCorrectionsApi({ status: 'PENDING', limit: 100 }) : null,
        listLeavesApi({ status: 'APPROVED', limit: 100 }).catch(() => null),
      ]);
      const from = `${month}-01`;
      const to = `${month}-${String(daysInMonth(month)).padStart(2, '0')}`;
      setData({
        staff: staff.data.items,
        corrections: (corrections?.data.items ?? []).filter((item) => item.date >= from && item.date <= to),
        leaves: (leaves?.data.items ?? []).filter((item) => item.fromDate <= to && item.toDate >= from),
        from,
        to,
      });
    } catch (err) {
      setLoadError(err.message);
    }
  }, [month, hasFeature]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const generate = async () => {
    setBusy(true);
    setError('');
    try {
      await generatePayrollApi(month);
      navigation.replace('PayrollReview', { month });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const header = <Header title="Before you generate" subtitle={periodLabel(month)} onBack={navigation.goBack} />;
  if (!data) {
    return (
      <Screen>
        {header}
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

  const active = data.staff.filter((person) => person.isActive);
  const inactive = data.staff.filter((person) => !person.isActive);
  const noSalary = active.filter((person) => !(Number(person.salaryStructure?.basic) > 0));
  const noBank = active.filter((person) => !person.bankDetails?.accountNo || !person.bankDetails?.ifsc);
  const joiners = active.filter((person) => person.joiningDate && String(person.joiningDate).slice(0, 10) > data.from && String(person.joiningDate).slice(0, 10) <= data.to);
  const closed = month < currentMonth();

  const rows = [
    {
      kind: closed ? 'ok' : 'warn',
      title: closed ? `Attendance closed for ${monthRangeLabel(month)}` : 'This month is not over yet',
      detail: closed ? undefined : 'Days still to come are counted as paid. You can make a draft now, but finalize only after the month ends.',
    },
    {
      kind: noSalary.length ? 'warn' : 'ok',
      title: `Salary structures set ${active.length - noSalary.length}/${active.length}`,
      detail: noSalary.length ? `Missing for ${noSalary.map((person) => person.name).join(', ')}. Their pay would be ₹0.` : undefined,
      action: noSalary.length ? 'Fix' : undefined,
      onAction: () => navigation.navigate('StaffForm', { id: noSalary[0]._id }),
      blocking: noSalary.length > 0,
    },
    { kind: 'info', title: `${data.leaves.length} approved leave${data.leaves.length === 1 ? '' : 's'} in this month`, detail: 'Approved leave is paid and not counted as LOP.' },
    hasFeature('corrections') && {
      kind: data.corrections.length ? 'warn' : 'ok',
      title: data.corrections.length ? `${data.corrections.length} punch correction${data.corrections.length === 1 ? '' : 's'} pending` : 'No pending punch corrections',
      detail: data.corrections.length ? 'Decide them first, or those days may count as LOP.' : undefined,
      action: data.corrections.length ? 'Review' : undefined,
      onAction: () => navigation.navigate('AdminTabs', { screen: 'Approvals' }),
    },
    {
      kind: noBank.length ? 'warn' : 'ok',
      title: noBank.length ? `${noBank.length} staff missing bank details` : 'Bank details complete',
      detail: noBank.length ? `${noBank.map((person) => person.name).join(', ')} will be left out of the bank transfer sheet.` : undefined,
      action: noBank.length ? 'Fix' : undefined,
      onAction: () => navigation.navigate('StaffForm', { id: noBank[0]._id }),
    },
    joiners.length > 0 && {
      kind: 'info',
      title: `${joiners.length} joined mid-month`,
      detail: `${joiners.map((person) => person.name).join(', ')}: days before joining are counted as LOP.`,
    },
    inactive.length > 0 && { kind: 'info', title: `${inactive.length} inactive staff excluded`, detail: 'Unless they worked or had leave in this month.' },
  ].filter(Boolean);

  const count = (kind) => rows.filter((row) => row.kind === kind).length;
  const blocked = rows.some((row) => row.blocking);

  return (
    <Screen
      footer={
        <>
          <Notice variant="danger">{error}</Notice>
          {blocked && <Notice variant="warning">Set the salary structure for every active staff member before generating.</Notice>}
          <PrimaryButton title="Generate draft payroll" onPress={generate} loading={busy} disabled={blocked || !active.length} />
        </>
      }
    >
      <Header title="Before you generate" subtitle={`${periodLabel(month)} · ${active.length} active staff`} onBack={navigation.goBack} />

      <View style={styles.tiles}>
        <StatTile value={String(count('ok'))} label="Ready" tone="success" />
        <StatTile value={String(count('warn'))} label="Need attention" tone={count('warn') ? 'warning' : undefined} />
        <StatTile value={String(count('info'))} label="For info" />
      </View>

      <Card padded={false}>
        {rows.map((row, index) => (
          <CheckRow key={row.title} {...row} divider={index < rows.length - 1} />
        ))}
      </Card>

      <Text style={text.small}>
        Pay is worked out on a 30-day month: each LOP day cuts 1/30 of the monthly salary, whatever the number of days in the month. The day
        basis is set in your account's global settings.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tiles: { flexDirection: 'row', gap: spacing.gap },
  check: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.gap, paddingHorizontal: spacing.gapLg, paddingVertical: 12 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  action: { minHeight: sizes.touch, minWidth: sizes.touch, justifyContent: 'center', alignItems: 'flex-end', marginTop: -10 },
  actionText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.success },
});
