import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Download } from 'lucide-react-native';
import { downloadAndShare } from '../../api/download';
import { payrollSlipPath } from '../../api/endpoints';
import { Card, Header, ListRow, Money, Notice, PrimaryButton, Screen } from '../../components';
import { colors, fonts, radius, spacing, text } from '../../theme';
import { formatMoney } from '../../utils/format';
import { daysBasisOf, maskTail, periodLabel, slipFilename } from '../../utils/salary';

const formatDays = (days) => (Number.isInteger(days) ? String(days) : days.toFixed(1));

function SectionCard({ title, children }) {
  return (
    <Card padded={false}>
      <View style={styles.cardHead}>
        <Text style={text.heading}>{title}</Text>
      </View>
      {children}
    </Card>
  );
}

const amount = (value) => <Money value={value} />;

// Staff: ek mahine ki slip. route.params.payroll: Salary screen wala (GET /payroll/my ka) record.
export default function SalarySlipScreen({ navigation, route }) {
  const { payroll } = route.params;
  const { staff = {}, earnings, deductions, employerContribution = {} } = payroll;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const identity = [staff.name, staff.employeeCode, staff.uan && `UAN ${maskTail(staff.uan)}`].filter(Boolean).join(' · ');
  const basis = daysBasisOf(payroll);
  const pfOn = deductions.pf > 0 || payroll.pfWage > 0;
  const employerPf = (employerContribution.eps ?? 0) + (employerContribution.epf ?? 0);

  const download = async () => {
    setBusy(true);
    setError('');
    try {
      await downloadAndShare(payrollSlipPath(payroll._id), slipFilename(payroll), { dialogTitle: `Salary slip, ${periodLabel(payroll.period)}` });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      footer={
        <>
          <Notice variant="danger">{error}</Notice>
          <PrimaryButton title="Download PDF slip" icon={Download} onPress={download} loading={busy} />
        </>
      }
    >
      <Header title={periodLabel(payroll.period)} subtitle={identity} onBack={navigation.goBack} />

      <View style={styles.netCard}>
        <View style={styles.netTop}>
          <Text style={styles.netLabel}>Net pay</Text>
          {staff.accountNo ? <Text style={styles.netMeta}>{[staff.bankName, maskTail(staff.accountNo)].filter(Boolean).join(' ')}</Text> : null}
        </View>
        <Money value={payroll.netSalary} large style={styles.netAmount} />
        <View style={styles.netRow}>
          <Text style={styles.netMeta}>
            Payable{' '}
            <Text style={styles.netMono}>
              {formatDays(payroll.payableDays)}/{basis}
            </Text>
          </Text>
          <Text style={styles.netMeta}>
            LOP <Text style={styles.netMono}>{formatDays(payroll.lopDays)}</Text>
          </Text>
        </View>
      </View>

      <SectionCard title="Earnings">
        <ListRow title="Basic" right={amount(earnings.basic)} />
        <ListRow title="HRA" right={amount(earnings.hra)} />
        <ListRow title="Special allowance" right={amount(earnings.special)} />
        <ListRow title="Other" right={amount(earnings.other)} />
        <ListRow title="Earned gross" right={<Money value={earnings.gross} style={styles.total} />} divider={false} />
      </SectionCard>

      <SectionCard title="Deductions">
        <ListRow
          title="Provident Fund (PF)"
          subtitle={pfOn ? `On wage ${formatMoney(payroll.pfWage)}` : 'Not applicable'}
          right={pfOn ? amount(deductions.pf) : <Text style={text.small}>—</Text>}
        />
        <ListRow
          title="ESI"
          subtitle={payroll.esiCovered ? undefined : 'Not applicable'}
          right={payroll.esiCovered ? amount(deductions.esi) : <Text style={text.small}>—</Text>}
        />
        <ListRow title="Other deductions" right={amount(deductions.other)} />
        <ListRow title="Total" right={<Money value={deductions.total} style={styles.total} />} divider={false} />
      </SectionCard>

      {employerPf > 0 && (
        <Text style={text.small}>
          Your employer also pays <Text style={styles.mutedMono}>{formatMoney(employerContribution.eps ?? 0)}</Text> to your pension (EPS)
          and <Text style={styles.mutedMono}>{formatMoney(employerContribution.epf ?? 0)}</Text> to your PF account (EPF) this month. It is
          not cut from your salary.
        </Text>
      )}
      {payroll.remarks ? <Text style={text.small}>Note: {payroll.remarks}</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardHead: { paddingHorizontal: spacing.gapLg, paddingTop: spacing.gapLg, paddingBottom: 4 },
  netCard: { backgroundColor: colors.success, borderRadius: radius.hero, padding: spacing.gapLg, gap: 8 },
  netTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.gap },
  netLabel: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.successTint },
  netAmount: { color: colors.onInk, fontSize: 36, lineHeight: 44 },
  netRow: { flexDirection: 'row', gap: spacing.gapLg },
  netMeta: { fontFamily: fonts.body, fontSize: 13, color: colors.successTint },
  netMono: { fontFamily: fonts.mono, color: colors.onInk },
  total: { fontFamily: fonts.monoSemiBold },
  mutedMono: { fontFamily: fonts.mono, color: colors.ink },
});
