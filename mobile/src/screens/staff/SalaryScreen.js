import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ChevronRight, Wallet } from 'lucide-react-native';
import { getMyPayrollsApi } from '../../api/endpoints';
import { Card, DarkCard, EmptyState, ErrorState, Header, ListRow, Money, Pill, Screen, Skeleton } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { colors, fonts, radius, sizes, spacing, text } from '../../theme';
import { currentMonth } from '../../utils/format';
import { financialYearOf, periodLabel } from '../../utils/salary';

const formatDays = (days) => (Number.isInteger(days) ? String(days) : days.toFixed(1));

// Sabse naya finalized mahina.
function LatestCard({ payroll, onOpen }) {
  return (
    <DarkCard>
      <View style={styles.cardTop}>
        <Text style={styles.onDarkLabel}>{periodLabel(payroll.period)} · Net pay</Text>
        <Pill variant="success">Finalized</Pill>
      </View>
      <Money value={payroll.netSalary} large style={styles.net} />
      <View style={styles.figures}>
        <View style={styles.figure}>
          <Text style={styles.onDarkSmall}>Gross</Text>
          <Money value={payroll.earnings.gross} style={styles.onDarkMono} />
        </View>
        <View style={styles.figure}>
          <Text style={styles.onDarkSmall}>Deductions</Text>
          <Money value={payroll.deductions.total} style={styles.onDarkMono} />
        </View>
        <View style={styles.figure}>
          <Text style={styles.onDarkSmall}>Payable days</Text>
          <Text style={styles.onDarkMono}>{formatDays(payroll.payableDays)}</Text>
        </View>
      </View>
      <Pressable style={styles.viewSlip} onPress={onOpen} accessibilityRole="button">
        <Text style={styles.viewSlipText}>View slip & download PDF</Text>
        <ChevronRight size={18} strokeWidth={2} color={colors.onInk} />
      </Pressable>
    </DarkCard>
  );
}

// Staff: apni finalized salary (GET /payroll/my), financial year ke hisaab se.
export default function SalaryScreen({ navigation }) {
  const { hasFeature } = useAuth();
  const enabled = hasFeature('payroll');
  const [state, setState] = useState({ rows: null, error: '', loading: true, refreshing: false });
  const [year, setYear] = useState(null); // null = sabse naye payroll ka FY

  const load = useCallback(async ({ pull = false } = {}) => {
    if (pull) setState((previous) => ({ ...previous, refreshing: true }));
    try {
      const res = await getMyPayrollsApi();
      setState({ rows: res.data.rows, error: '', loading: false, refreshing: false });
    } catch (err) {
      setState((previous) => ({ ...previous, error: err.message, loading: false, refreshing: false }));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (enabled) load();
    }, [enabled, load])
  );

  if (!enabled) {
    return (
      <Screen edges={['top']}>
        <Header title="Salary" />
        <Card>
          <EmptyState icon={Wallet} title="Salary slips are not on your plan" message="Your company's plan does not include payroll. Ask your admin." />
        </Card>
      </Screen>
    );
  }

  const rows = state.rows ?? [];
  // Jin FY ki slips hain (naya pehle). Ek se zyada hon to chip dabane par agla FY.
  const years = [...new Set(rows.map((row) => financialYearOf(row.period)))];
  const shownYear = year && years.includes(year) ? year : (years[0] ?? financialYearOf(currentMonth()));
  const inYear = rows.filter((row) => financialYearOf(row.period) === shownYear);
  const [latest, ...earlier] = inYear;
  const nextYear = () => setYear(years[(years.indexOf(shownYear) + 1) % years.length]);
  const open = (payroll) => navigation.navigate('SalarySlip', { payroll });

  return (
    <Screen edges={['top']} onRefresh={() => load({ pull: true })} refreshing={state.refreshing}>
      <Header
        title="Salary"
        right={
          <Pressable
            style={styles.fyChip}
            onPress={nextYear}
            disabled={years.length < 2}
            accessibilityRole={years.length > 1 ? 'button' : undefined}
            accessibilityLabel={`Financial year ${shownYear}${years.length > 1 ? ', tap to change' : ''}`}
          >
            <Text style={styles.fyText}>FY {shownYear}</Text>
          </Pressable>
        }
      />

      {state.loading && !state.rows ? (
        <>
          <Skeleton height={240} borderRadius={radius.hero} />
          <Skeleton height={140} borderRadius={radius.card} />
        </>
      ) : state.error && !state.rows ? (
        <Card>
          <ErrorState message={state.error} onRetry={load} />
        </Card>
      ) : !latest ? (
        <Card>
          <EmptyState icon={Wallet} title="No salary slips yet" message="Your slip appears here once your admin finalizes the month's payroll." />
        </Card>
      ) : (
        <>
          <LatestCard payroll={latest} onOpen={() => open(latest)} />
          {earlier.length > 0 && (
            <Card padded={false}>
              <View style={styles.cardHead}>
                <Text style={text.heading}>Earlier months</Text>
              </View>
              {earlier.map((payroll, index) => (
                <ListRow
                  key={payroll._id}
                  title={periodLabel(payroll.period)}
                  subtitle={payroll.lopDays > 0 ? `${formatDays(payroll.lopDays)} day${payroll.lopDays === 1 ? '' : 's'} LOP` : undefined}
                  subtitleTone="warning"
                  right={<Money value={payroll.netSalary} />}
                  onPress={() => open(payroll)}
                  divider={index < earlier.length - 1}
                />
              ))}
            </Card>
          )}
        </>
      )}

      <Text style={text.small}>Only finalized months appear here.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fyChip: {
    minHeight: sizes.touch,
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
  },
  fyText: { fontFamily: fonts.mono, fontSize: 13, color: colors.ink },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.gap },
  onDarkLabel: { flexShrink: 1, fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.onInkMuted },
  net: { color: colors.onInk, fontSize: 40, lineHeight: 48 },
  figures: { flexDirection: 'row', gap: spacing.gap },
  figure: { flex: 1, gap: 2 },
  onDarkSmall: { fontFamily: fonts.body, fontSize: 12, color: colors.onInkMuted },
  onDarkMono: { fontFamily: fonts.mono, fontSize: 15, color: colors.onInk },
  viewSlip: {
    minHeight: sizes.touch,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.14)',
    paddingTop: spacing.gap,
    marginTop: 4,
  },
  viewSlipText: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.onInk },
  cardHead: { paddingHorizontal: spacing.gapLg, paddingTop: spacing.gapLg, paddingBottom: 4 },
});
