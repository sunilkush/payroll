import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { IndianRupee } from 'lucide-react-native';
import { listPayrollApi, listStaffApi } from '../../api/endpoints';
import { Card, DarkCard, EmptyState, ErrorState, Header, ListRow, Money, Pill, PrimaryButton, Screen, Skeleton } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { colors, fonts, radius, sizes, spacing, text } from '../../theme';
import { currentMonth, formatDate } from '../../utils/format';
import { fyMonths, fyStartOf, lockedAtOf, monthName, monthRangeLabel, monthState } from '../../utils/payroll';
import { periodLabel } from '../../utils/salary';

const STATE_PILL = {
  OPEN: { variant: 'neutral', label: 'Open' },
  TODO: { variant: 'warning', label: 'To do' },
  DRAFT: { variant: 'warning', label: 'Draft' },
  LOCKED: { variant: 'success', label: 'Locked' },
};

// Admin: FY ke mahine aur unki payroll ki haalat. Server mahine-wise list deta hai, isliye har mahine ki ek request.
export default function PayrollScreen({ navigation }) {
  const { hasFeature } = useAuth();
  const enabled = hasFeature('payroll');
  const thisFy = fyStartOf(currentMonth());
  const [fy, setFy] = useState(thisFy);
  const [state, setState] = useState({ months: null, error: '' });
  const [activeStaff, setActiveStaff] = useState(null);

  const load = useCallback(async () => {
    try {
      const months = fyMonths(fy).reverse();
      const results = await Promise.all(months.map((month) => listPayrollApi(month).then((res) => res.data)));
      setState({ months: months.map((month, index) => ({ month, data: results[index], state: monthState(month, results[index]) })), error: '' });
    } catch (err) {
      setState((previous) => ({ ...previous, error: err.message }));
    }
    listStaffApi({ status: 'active', limit: 1 })
      .then((res) => setActiveStaff(res.data.counts.active))
      .catch(() => {});
  }, [fy]);

  useFocusEffect(
    useCallback(() => {
      if (enabled) load();
    }, [enabled, load])
  );

  if (!enabled) {
    return (
      <Screen edges={['top']}>
        <Header title="Payroll" />
        <Card>
          <EmptyState icon={IndianRupee} title="Payroll is not on your plan" message="Upgrade your plan to run payroll and publish salary slips." />
        </Card>
      </Screen>
    );
  }

  const months = state.months ?? [];
  // Chalane layak: sabse purana khatam hua mahina jo abhi lock nahi hua (draft ho to wahi).
  const ready = [...months].reverse().find((item) => item.state === 'TODO' || item.state === 'DRAFT');

  const open = (item) => {
    if (item.state === 'LOCKED') navigation.navigate('PayrollLocked', { month: item.month });
    else if (item.state === 'DRAFT') navigation.navigate('PayrollReview', { month: item.month });
    else navigation.navigate('PayrollPrecheck', { month: item.month });
  };

  return (
    <Screen edges={['top']} onRefresh={load}>
      <Header
        title="Payroll"
        right={
          <Pressable style={styles.fyChip} onPress={() => setFy(fy === thisFy ? thisFy - 1 : thisFy)} accessibilityRole="button" accessibilityLabel={`Financial year ${fy}, tap to change`}>
            <Text style={styles.fyText}>
              FY {fy}–{String((fy + 1) % 100).padStart(2, '0')}
            </Text>
          </Pressable>
        }
      />

      {state.error && !state.months ? (
        <Card>
          <ErrorState message={state.error} onRetry={load} />
        </Card>
      ) : !state.months ? (
        <>
          <Skeleton height={200} borderRadius={radius.hero} />
          <Skeleton height={220} borderRadius={radius.card} />
        </>
      ) : (
        <>
          {ready && (
            <DarkCard>
              <View style={styles.heroTop}>
                <Text style={styles.onDarkLabel}>Ready to run · {periodLabel(ready.month)}</Text>
                <Pill variant={ready.state === 'DRAFT' ? 'warning' : 'neutral'}>{ready.state === 'DRAFT' ? 'Draft' : 'Not generated'}</Pill>
              </View>
              <Text style={styles.heroText}>
                Attendance for {monthRangeLabel(ready.month)} is closed.{' '}
                {activeStaff != null ? `${activeStaff} active staff will be included.` : ''}
              </Text>
              <PrimaryButton
                title={ready.state === 'DRAFT' ? `Continue ${monthName(ready.month)} payroll` : `Start ${monthName(ready.month)} payroll`}
                onPress={() => open(ready)}
                style={styles.start}
              />
            </DarkCard>
          )}

          <View style={styles.group}>
            <Text style={styles.sectionTitle}>All months</Text>
            <Card padded={false}>
              {months.map((item, index) => {
                const pill = STATE_PILL[item.state];
                const rows = item.data?.rows ?? [];
                const lockedAt = item.state === 'LOCKED' ? lockedAtOf(rows) : null;
                return (
                  <ListRow
                    key={item.month}
                    title={periodLabel(item.month)}
                    subtitle={
                      item.state === 'LOCKED'
                        ? `Locked ${lockedAt ? formatDate(lockedAt) : ''} · ${rows.length} slip${rows.length === 1 ? '' : 's'} published`
                        : item.state === 'DRAFT'
                          ? `${rows.length} staff in draft`
                          : item.state === 'OPEN'
                            ? 'Month in progress'
                            : 'Not generated'
                    }
                    subtitleTone={item.state === 'TODO' ? 'warning' : undefined}
                    right={
                      <View style={styles.rowRight}>
                        {rows.length ? <Money value={item.data.totals.netSalary} /> : null}
                        <Pill variant={pill.variant}>{pill.label}</Pill>
                      </View>
                    }
                    onPress={() => open(item)}
                    divider={index < months.length - 1}
                  />
                );
              })}
            </Card>
          </View>

          <Text style={text.small}>
            Locking a month saves a snapshot of every slip (name, bank, salary and attendance as they were). Later changes to staff or
            attendance do not change a locked month.
          </Text>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  fyChip: { minHeight: sizes.touch, justifyContent: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingHorizontal: 14 },
  fyText: { fontFamily: fonts.mono, fontSize: 13, color: colors.ink },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.gap },
  onDarkLabel: { flexShrink: 1, fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.onInk },
  heroText: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.onInkMuted },
  // successBright par safed text padhne mein kamzor hai, isliye gehra hara
  start: { backgroundColor: colors.success },
  group: { gap: 8 },
  sectionTitle: { ...text.label, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 12 },
  rowRight: { alignItems: 'flex-end', gap: 4 },
});
