import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Download, FileSpreadsheet, FileText, Landmark, Lock } from 'lucide-react-native';
import { downloadAndShare } from '../../api/download';
import { listPayrollApi, payrollExportPath, payrollSlipPath } from '../../api/endpoints';
import { BottomSheet, Card, ErrorState, Header, ListRow, Money, Notice, PrimaryButton, Screen, SkeletonList } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { colors, fonts, radius, spacing, text } from '../../theme';
import { formatDate, formatTime, todayStr } from '../../utils/format';
import { lockedAtOf, monthName, shareBankSheet } from '../../utils/payroll';
import { periodLabel, slipFilename } from '../../utils/salary';

// Admin: lock ho chuka mahina aur aage ke kaam (bank sheet, CA sheet, slips). route.params: { month }
export default function PayrollLockedScreen({ navigation, route }) {
  const { month } = route.params;
  const { hasFeature } = useAuth();
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState({ text: '', variant: 'danger' });
  const [slipsOpen, setSlipsOpen] = useState(false);

  const load = useCallback(async () => {
    setLoadError('');
    try {
      const res = await listPayrollApi(month);
      setData(res.data);
    } catch (err) {
      setLoadError(err.message);
    }
  }, [month]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const run = async (key, task) => {
    setBusy(key);
    setNotice({ text: '', variant: 'danger' });
    try {
      await task();
    } catch (err) {
      setNotice({ text: err.message || 'Something went wrong. Try again.', variant: 'danger' });
    } finally {
      setBusy('');
    }
  };

  const bankSheet = () =>
    run('bank', async () => {
      const { skipped } = await shareBankSheet(month, data.rows);
      if (skipped.length) setNotice({ text: `Left out of the bank sheet (no bank details): ${skipped.join(', ')}. Pay them separately.`, variant: 'warning' });
    });

  const caSheet = () =>
    run('ca', () =>
      downloadAndShare(payrollExportPath(month), `payroll-${month}.xlsx`, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: `Payroll, ${periodLabel(month)}`,
      })
    );

  const slip = (row) => run(`slip-${row._id}`, () => downloadAndShare(payrollSlipPath(row._id), slipFilename(row), { dialogTitle: `Salary slip, ${row.staff?.name}` }));

  if (!data) {
    return (
      <Screen>
        <Header title={periodLabel(month)} onBack={navigation.goBack} />
        {loadError ? (
          <Card>
            <ErrorState message={loadError} onRetry={load} />
          </Card>
        ) : (
          <SkeletonList rows={3} />
        )}
      </Screen>
    );
  }

  const { rows, totals } = data;
  const lockedAt = lockedAtOf(rows);
  const when = lockedAt ? `${lockedAt.slice(0, 10) === todayStr() ? 'today' : formatDate(lockedAt)} ${formatTime(lockedAt)}` : '';

  return (
    <Screen footer={<PrimaryButton title="Done" onPress={() => navigation.navigate('AdminTabs', { screen: 'Payroll' })} />}>
      <Header title={periodLabel(month)} onBack={navigation.goBack} />

      <View style={styles.hero}>
        <View style={styles.lock}>
          <Lock size={22} strokeWidth={2} color={colors.success} />
        </View>
        <Text style={styles.heroTitle}>{monthName(month)} is locked</Text>
        <Text style={styles.heroMeta}>
          Finalized {when} · {rows.length} slip{rows.length === 1 ? '' : 's'} published
        </Text>
        <Text style={styles.heroLabel}>Net to pay</Text>
        <Money value={totals.netSalary} large style={styles.heroAmount} />
      </View>

      <Notice variant={notice.variant}>{notice.text}</Notice>

      <View style={styles.group}>
        <Text style={styles.sectionTitle}>Next steps</Text>
        <Card padded={false}>
          <ListRow
            left={<Landmark size={20} strokeWidth={1.8} color={colors.ink} />}
            title="Bank transfer sheet"
            subtitle={busy === 'bank' ? 'Preparing…' : 'CSV for your bank: account, IFSC and amount'}
            onPress={busy ? undefined : bankSheet}
          />
          {hasFeature('exports') && (
            <ListRow
              left={<FileSpreadsheet size={20} strokeWidth={1.8} color={colors.ink} />}
              title="Full payroll sheet for CA"
              subtitle={busy === 'ca' ? 'Downloading…' : 'Excel with every earning and deduction'}
              onPress={busy ? undefined : caSheet}
            />
          )}
          <ListRow
            left={<FileText size={20} strokeWidth={1.8} color={colors.ink} />}
            title="Salary slips (PDF)"
            subtitle={`${rows.length} slips, also visible in each staff member's app`}
            onPress={() => setSlipsOpen(true)}
            divider={false}
          />
        </Card>
      </View>

      <Card>
        <View style={styles.depositRow}>
          <Text style={[text.bodySemiBold, styles.flex]}>Employee PF + ESI to deposit</Text>
          <Money value={totals.pf + totals.esi} style={styles.bold} />
        </View>
        <Text style={text.small}>
          PF <Text style={styles.mono}>{Math.round(totals.pf).toLocaleString('en-IN')}</Text> · ESI{' '}
          <Text style={styles.mono}>{Math.round(totals.esi).toLocaleString('en-IN')}</Text>. Your employer share (
          <Text style={styles.mono}>₹{Math.round(totals.employerContribution).toLocaleString('en-IN')}</Text>) is deposited along with it.
        </Text>
      </Card>

      <BottomSheet visible={slipsOpen} onClose={() => setSlipsOpen(false)} title="Salary slips">
        <Card padded={false}>
          {rows.map((row, index) => (
            <ListRow
              key={row._id}
              title={row.staff?.name ?? 'Staff'}
              subtitle={busy === `slip-${row._id}` ? 'Downloading…' : row.staff?.employeeCode}
              right={<Download size={18} strokeWidth={2} color={colors.ink} />}
              onPress={busy ? undefined : () => slip(row)}
              divider={index < rows.length - 1}
            />
          ))}
        </Card>
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { backgroundColor: colors.success, borderRadius: radius.hero, padding: spacing.gapLg, gap: 4 },
  lock: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.successTint, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  heroTitle: { fontFamily: fonts.heading, fontSize: 24, color: colors.onInk },
  heroMeta: { fontFamily: fonts.body, fontSize: 13, color: colors.successTint },
  heroLabel: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.successTint, marginTop: 10 },
  heroAmount: { color: colors.onInk, fontSize: 34, lineHeight: 42 },
  group: { gap: 8 },
  sectionTitle: { ...text.label, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 12 },
  depositRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.gap },
  bold: { fontFamily: fonts.monoSemiBold },
  mono: { fontFamily: fonts.mono, color: colors.ink },
});
