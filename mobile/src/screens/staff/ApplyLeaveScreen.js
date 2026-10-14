import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { applyLeaveApi } from '../../api/endpoints';
import { Card, FormField, Header, Notice, PickerField, PrimaryButton, Screen, SegmentedControl } from '../../components';
import { useLeaveBalance } from '../../hooks/useLeaveBalance';
import { colors, fonts, radius, sizes, spacing, text } from '../../theme';
import { todayStr } from '../../utils/format';
import { dayCount, estimateLeaveDays, formatLeaveDays, guessWeekOffDays, LEAVE_NAME, LEAVE_SHORT } from '../../utils/leave';

const DURATIONS = [
  { value: 'full', label: 'Full day' },
  { value: 'half', label: 'Half day' },
];
const HALVES = [
  { value: 'FIRST', label: 'First half' },
  { value: 'SECOND', label: 'Second half' },
];

// Staff: leave ki application (POST /leaves). Balance kam ho to bhejne se pehle hi rok dete hain.
// route.params.balance: Leave screen ka balance (turant dikhane ke liye; yahan bhi taaza aata hai).
export default function ApplyLeaveScreen({ navigation, route }) {
  const fresh = useLeaveBalance();
  const balance = fresh.balance ?? route.params?.balance ?? null;
  const [type, setType] = useState('CL');
  const [duration, setDuration] = useState('full');
  const [half, setHalf] = useState('FIRST');
  const [fromDate, setFromDate] = useState(todayStr());
  const [toDate, setToDate] = useState(todayStr());
  const [reason, setReason] = useState('');
  const [weekOffDays, setWeekOffDays] = useState([0]);
  const [fields, setFields] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    guessWeekOffDays().then(setWeekOffDays);
  }, []);

  const isHalf = duration === 'half';
  const to = isHalf ? fromDate : toDate;
  const days = estimateLeaveDays({ fromDate, toDate: to, halfDay: isHalf, weekOffDays });
  const available = balance?.[type]?.available ?? 0;
  const short = Boolean(balance) && days > available;
  const after = Math.max(0, available - days);

  const changeFrom = (value) => {
    setFromDate(value);
    // To kabhi From se pehle na rahe.
    if (toDate < value) setToDate(value);
    setFields((previous) => ({ ...previous, fromDate: undefined, toDate: undefined }));
  };

  const submit = async () => {
    const problems = {};
    if (to < fromDate) problems.toDate = 'To date cannot be before from date.';
    if (reason.trim().length < 3) problems.reason = 'Write a short reason (at least 3 characters).';
    setFields(problems);
    if (Object.keys(problems).length || short) return;

    setBusy(true);
    setError('');
    try {
      await applyLeaveApi({ type, fromDate, toDate: to, ...(isHalf && { halfDay: half }), reason: reason.trim() });
      navigation.navigate('Tabs', { screen: 'Leave', params: { toast: 'Leave sent for approval.' } });
    } catch (err) {
      setFields(err.fields);
      const known = ['type', 'fromDate', 'toDate', 'halfDay', 'reason'];
      if (!Object.keys(err.fields).some((key) => known.includes(key))) setError(err.message);
      setBusy(false);
    }
  };

  const typeOptions = ['CL', 'EL'].map((code) => ({
    value: code,
    label: balance ? `${LEAVE_SHORT[code]} · ${formatLeaveDays(balance[code].available)} left` : LEAVE_SHORT[code],
  }));

  return (
    <Screen>
      <Header title="Apply for leave" onBack={navigation.goBack} />
      <Notice variant="danger">{error || (!balance && fresh.error) || ''}</Notice>

      <View style={styles.group}>
        <Text style={text.label}>Leave type</Text>
        <SegmentedControl options={typeOptions} value={type} onChange={setType} />
      </View>

      <View style={styles.group}>
        <Text style={text.label}>Duration</Text>
        <SegmentedControl options={DURATIONS} value={duration} onChange={setDuration} />
        {isHalf && (
          <View style={styles.halves}>
            {HALVES.map((option) => {
              const selected = half === option.value;
              return (
                <Pressable
                  key={option.value}
                  style={[styles.half, selected && styles.halfSelected]}
                  onPress={() => setHalf(option.value)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                >
                  <Text style={[styles.halfText, selected && styles.halfTextSelected]}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      <View style={styles.dates}>
        <PickerField label={isHalf ? 'Date' : 'From'} mode="date" value={fromDate} onChange={changeFrom} error={fields.fromDate} disabled={busy} />
        {!isHalf && (
          <PickerField
            label="To"
            mode="date"
            value={toDate}
            min={fromDate}
            onChange={(value) => {
              setToDate(value);
              setFields((previous) => ({ ...previous, toDate: undefined }));
            }}
            error={fields.toDate}
            disabled={busy}
          />
        )}
      </View>

      <FormField
        label="Reason"
        value={reason}
        onChangeText={(value) => {
          setReason(value);
          setFields((previous) => ({ ...previous, reason: undefined }));
        }}
        error={fields.reason}
        placeholder="For example: family function in my village"
        multiline
        maxLength={500}
        editable={!busy}
      />

      <Card style={short && styles.shortCard}>
        <View style={styles.summary}>
          <View style={styles.flex}>
            <Text style={text.small}>Will be deducted</Text>
            <Text style={text.bodySemiBold}>
              {LEAVE_NAME[type]} ·{' '}
              <Text style={styles.mono}>
                {formatLeaveDays(available)} → {formatLeaveDays(after)}
              </Text>
            </Text>
          </View>
          <Text style={styles.days}>{dayCount(days)}</Text>
        </View>
        {short ? (
          <Text style={styles.shortText} accessibilityRole="alert">
            Not enough {LEAVE_NAME[type]}: you have {formatLeaveDays(available)}, this needs {formatLeaveDays(days)}.
          </Text>
        ) : (
          !isHalf && <Text style={text.small}>Weekly offs are not counted. Holidays are also left out when your admin's calendar has them.</Text>
        )}
      </Card>

      <PrimaryButton title="Send for approval" onPress={submit} loading={busy} disabled={!balance || short || days === 0} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  group: { gap: 8 },
  halves: { flexDirection: 'row', gap: spacing.gap, marginTop: 4 },
  half: {
    flex: 1,
    minHeight: sizes.touch + 4,
    borderRadius: radius.input,
    borderWidth: 1.5,
    borderColor: colors.inputBorder,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halfSelected: { borderColor: colors.success, backgroundColor: colors.successTint },
  halfText: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.ink },
  halfTextSelected: { fontFamily: fonts.bodySemiBold, color: colors.successDark },
  dates: { flexDirection: 'row', gap: spacing.gap },
  summary: { flexDirection: 'row', alignItems: 'center', gap: spacing.gap },
  mono: { fontFamily: fonts.mono },
  days: { fontFamily: fonts.monoSemiBold, fontSize: 17, color: colors.ink },
  shortCard: { borderColor: colors.danger },
  shortText: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.danger },
});
