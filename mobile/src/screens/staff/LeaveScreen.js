import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { CalendarHeart, CalendarOff, Plus } from 'lucide-react-native';
import { cancelLeaveApi, listLeavesApi } from '../../api/endpoints';
import {
  BottomSheet,
  Card,
  DarkCard,
  EmptyState,
  ErrorState,
  Header,
  ListRow,
  Notice,
  PrimaryButton,
  Screen,
  SecondaryButton,
  Skeleton,
  SkeletonList,
  StatusPill,
  Toast,
} from '../../components';
import { useAuth } from '../../context/AuthContext';
import { useLeaveBalance } from '../../hooks/useLeaveBalance';
import { colors, fonts, radius, sizes, spacing, text } from '../../theme';
import { currentMonth, formatDate, formatMonth, shiftMonth } from '../../utils/format';
import { dayCount, formatLeaveDays, LEAVE_NAME } from '../../utils/leave';

// '14 Oct' ya '14 Oct – 16 Oct'
const rangeOf = (leave) => (leave.fromDate === leave.toDate ? formatDate(leave.fromDate) : `${formatDate(leave.fromDate)} – ${formatDate(leave.toDate)}`);
const halfLabel = { FIRST: 'First half', SECOND: 'Second half' };

function BalanceCards({ balance }) {
  const pending = (bucket) => (bucket.pending ? `${formatLeaveDays(bucket.pending)} waiting for approval` : 'Available now');
  return (
    <View style={styles.balances}>
      <DarkCard hero={false} style={styles.balance}>
        <Text style={styles.onDarkLabel}>Casual Leave</Text>
        <Text style={[styles.balanceNumber, styles.onDark]}>{formatLeaveDays(balance.CL.available)}</Text>
        <Text style={styles.onDarkSmall}>{pending(balance.CL)}</Text>
      </DarkCard>
      <Card style={styles.balance}>
        <Text style={styles.label}>Earned Leave</Text>
        <Text style={styles.balanceNumber}>{formatLeaveDays(balance.EL.available)}</Text>
        <Text style={text.small}>incl. carry-forward</Text>
      </Card>
    </View>
  );
}

// Staff: leave balance aur apni applications.
export default function LeaveScreen({ navigation, route }) {
  const { company } = useAuth();
  const enabled = company?.leaveEnabled !== false;
  const { balance, error: balanceError, loading: balanceLoading, reload: reloadBalance } = useLeaveBalance();
  const [list, setList] = useState({ items: null, error: '', loading: true });
  const [open, setOpen] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const toast = route.params?.toast ?? '';
  const hideToast = useCallback(() => navigation.setParams({ toast: undefined }), [navigation]);

  const loadList = useCallback(async () => {
    try {
      const res = await listLeavesApi({ limit: 30 });
      setList({ items: res.data.items, error: '', loading: false });
    } catch (err) {
      setList((previous) => ({ ...previous, error: err.message, loading: false }));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (enabled) loadList();
    }, [enabled, loadList])
  );

  const refresh = () => {
    reloadBalance();
    loadList();
  };

  // Header ke daayein: company ki holidays
  const holidaysPill = (
    <Pressable style={styles.holidays} onPress={() => navigation.navigate('StaffHolidays')} accessibilityRole="button">
      <CalendarHeart size={16} strokeWidth={2} color={colors.ink} />
      <Text style={styles.holidaysText}>Holidays</Text>
    </Pressable>
  );

  const cancel = async () => {
    setCancelling(true);
    setCancelError('');
    try {
      await cancelLeaveApi(open._id);
      setOpen(null);
      refresh();
    } catch (err) {
      setCancelError(err.message);
    } finally {
      setCancelling(false);
    }
  };

  if (!enabled) {
    return (
      <Screen edges={['top']}>
        <Header title="Leave" right={holidaysPill} />
        <Card>
          <EmptyState icon={CalendarOff} title="Leave is turned off" message="Your company does not use leave management in the app. Ask your admin." />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen edges={['top']} onRefresh={refresh} overlay={<Toast message={toast} onHide={hideToast} />}>
      <Header title="Leave" subtitle={balance ? `Balance for ${balance.year}` : undefined} right={holidaysPill} />

      {balanceLoading && !balance ? (
        <View style={styles.balances}>
          <Skeleton height={130} borderRadius={radius.card} style={styles.balance} />
          <Skeleton height={130} borderRadius={radius.card} style={styles.balance} />
        </View>
      ) : !balance ? (
        <Card>
          <ErrorState message={balanceError} onRetry={reloadBalance} />
        </Card>
      ) : (
        <>
          <BalanceCards balance={balance} />
          {/* Credit cron har mahine ki 1 tarikh ko lagta hai */}
          <Text style={text.small}>
            Next credit on 1 {formatMonth(shiftMonth(currentMonth(), 1)).split(' ')[0]} · CL + EL added monthly
          </Text>
          <PrimaryButton title="Apply for leave" icon={Plus} style={styles.apply} onPress={() => navigation.navigate('ApplyLeave', { balance })} />
        </>
      )}

      <Card padded={false}>
        <View style={styles.cardHead}>
          <Text style={text.heading}>Applications</Text>
        </View>
        {list.loading && !list.items ? (
          <View style={styles.cardBody}>
            <SkeletonList rows={3} />
          </View>
        ) : list.error && !list.items ? (
          <ErrorState message={list.error} onRetry={loadList} />
        ) : !list.items.length ? (
          <EmptyState title="No applications yet" message="Leave you apply for appears here with its status." />
        ) : (
          list.items.map((leave, index) => (
            <View key={leave._id} style={index < list.items.length - 1 && styles.divider}>
              <ListRow
                title={`${rangeOf(leave)} · ${leave.type}`}
                subtitle={`${leave.halfDay ? halfLabel[leave.halfDay] : dayCount(leave.days)} · ${leave.reason}`}
                right={<StatusPill status={leave.status} />}
                onPress={() => {
                  setCancelError('');
                  setOpen(leave);
                }}
                divider={false}
              />
              {leave.status === 'REJECTED' && leave.actionNote ? (
                <View style={styles.comment}>
                  <Text style={styles.commentText}>Admin: {leave.actionNote}</Text>
                </View>
              ) : null}
            </View>
          ))
        )}
      </Card>

      <BottomSheet visible={Boolean(open)} onClose={() => setOpen(null)} title={open ? LEAVE_NAME[open.type] : ''}>
        {open && (
          <>
            <View style={styles.row}>
              <StatusPill status={open.status} />
            </View>
            <Card padded={false}>
              <ListRow title="Dates" value={rangeOf(open)} />
              <ListRow title="Days" value={open.halfDay ? `0.5 · ${halfLabel[open.halfDay]}` : String(open.days)} divider={false} />
            </Card>
            <Text style={text.body}>{open.reason}</Text>
            {open.actionNote ? <Notice variant={open.status === 'REJECTED' ? 'danger' : 'info'}>Admin: {open.actionNote}</Notice> : null}
            <Notice variant="danger">{cancelError}</Notice>
            {open.status === 'PENDING' && <SecondaryButton title="Cancel application" danger onPress={cancel} loading={cancelling} />}
          </>
        )}
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  balances: { flexDirection: 'row', gap: spacing.gap },
  balance: { flex: 1 },
  label: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.muted },
  onDarkLabel: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.onInkMuted },
  balanceNumber: { fontFamily: fonts.monoSemiBold, fontSize: 36, lineHeight: 44, color: colors.ink },
  onDark: { color: colors.onInk },
  onDarkSmall: { fontFamily: fonts.body, fontSize: 13, color: colors.onInkMuted },
  apply: { backgroundColor: colors.success },
  cardHead: { paddingHorizontal: spacing.gapLg, paddingTop: spacing.gapLg, paddingBottom: 4 },
  cardBody: { padding: spacing.gapLg },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  comment: { marginHorizontal: spacing.gapLg, marginBottom: spacing.gap, backgroundColor: colors.dangerTint, borderRadius: radius.input, padding: 10 },
  commentText: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.danger },
  row: { flexDirection: 'row' },
  holidays: {
    minHeight: sizes.touch,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
  },
  holidaysText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.ink },
});
