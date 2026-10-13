import { useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { applyLeaveApi, cancelLeaveApi, getLeaveBalanceApi, listLeavesApi } from '../../api/endpoints.js';
import { Button, Card, Empty, Notice, Screen, Stat, StatRow, StatusBadge, styles } from '../../components/ui.js';
import { colors, radius, space } from '../../theme.js';
import { addDays, formatDate, isValidDateStr, todayStr } from '../../utils/format.js';
import { useLoad } from '../../utils/useLoad.js';

const fetchLeaves = async () => {
  const [balance, list] = await Promise.all([getLeaveBalanceApi(), listLeavesApi({ limit: 50 })]);
  return { balance: balance.data.balance, leaves: list.data.items };
};

const DAY_OPTIONS = [
  { value: '', label: 'Full day' },
  { value: 'FIRST', label: 'First half' },
  { value: 'SECOND', label: 'Second half' },
];

// Do-teen options mein se ek chunne wale button (leave type, half day)
function Choice({ options, value, onChange }) {
  return (
    <View style={{ flexDirection: 'row', gap: space.sm }}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            style={{
              flex: 1,
              minHeight: 44,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: radius,
              borderWidth: 1,
              borderColor: selected ? colors.primary : colors.border,
              backgroundColor: selected ? colors.primaryLight : colors.surface,
            }}
          >
            <Text style={{ color: selected ? colors.primary : colors.textSecondary, fontWeight: '600' }}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function ApplyForm({ onDone, onCancel }) {
  const tomorrow = addDays(todayStr(), 1);
  const [form, setForm] = useState({ type: 'CL', fromDate: tomorrow, toDate: tomorrow, halfDay: '', reason: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (field) => (value) => setForm((previous) => ({ ...previous, [field]: value }));

  async function submit() {
    // Half day ek hi din ki hoti hai, isliye "to" date wahi rehti hai.
    const payload = { ...form, toDate: form.halfDay ? form.fromDate : form.toDate, reason: form.reason.trim() };
    if (!isValidDateStr(payload.fromDate) || !isValidDateStr(payload.toDate)) return setError('Enter dates as YYYY-MM-DD.');
    if (payload.toDate < payload.fromDate) return setError('To date cannot be before from date.');
    if (payload.reason.length < 3) return setError('Enter a reason.');

    setSaving(true);
    setError('');
    try {
      await applyLeaveApi(payload);
      onDone();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <Card>
      <Text style={styles.heading}>Apply for leave</Text>
      {error ? <Notice tone="danger" text={error} /> : null}
      <Choice options={[{ value: 'CL', label: 'CL' }, { value: 'EL', label: 'EL' }]} value={form.type} onChange={set('type')} />
      <Choice options={DAY_OPTIONS} value={form.halfDay} onChange={set('halfDay')} />
      <Text style={styles.label}>{form.halfDay ? 'Date' : 'From'} (YYYY-MM-DD)</Text>
      <TextInput style={styles.input} value={form.fromDate} onChangeText={set('fromDate')} keyboardType="numbers-and-punctuation" maxLength={10} />
      {form.halfDay ? null : (
        <>
          <Text style={styles.label}>To (YYYY-MM-DD)</Text>
          <TextInput style={styles.input} value={form.toDate} onChangeText={set('toDate')} keyboardType="numbers-and-punctuation" maxLength={10} />
        </>
      )}
      <Text style={styles.label}>Reason</Text>
      <TextInput
        style={[styles.input, { minHeight: 80, paddingTop: space.md, textAlignVertical: 'top' }]}
        value={form.reason}
        onChangeText={set('reason')}
        multiline
        maxLength={500}
      />
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <Button label="Cancel" variant="outline" onPress={onCancel} style={{ flex: 1 }} />
        <Button label="Submit" onPress={submit} loading={saving} style={{ flex: 1 }} />
      </View>
    </Card>
  );
}

export default function Leaves() {
  const { data, error, loading, refreshing, refresh, reload } = useLoad(fetchLeaves);
  const [applying, setApplying] = useState(false);

  const cancel = (leave) =>
    Alert.alert('Cancel this leave request?', `${formatDate(leave.fromDate)} - ${formatDate(leave.toDate)}`, [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel request',
        style: 'destructive',
        onPress: () => cancelLeaveApi(leave._id).then(reload, (err) => Alert.alert('Could not cancel', err.message)),
      },
    ]);

  return (
    <Screen title="My leaves" loading={loading} refreshing={refreshing} onRefresh={refresh} error={error}>
      {data ? (
        <>
          <StatRow>
            {['CL', 'EL'].map((type) => (
              <Stat key={type} label={`${type} available`} value={data.balance[type].available} tone="success" />
            ))}
            <Stat label="Pending approval" value={data.balance.CL.pending + data.balance.EL.pending} tone="warning" />
          </StatRow>

          {applying ? (
            <ApplyForm
              onCancel={() => setApplying(false)}
              onDone={() => {
                setApplying(false);
                reload();
              }}
            />
          ) : (
            <Button label="Apply for leave" onPress={() => setApplying(true)} />
          )}

          {data.leaves.length ? null : <Empty text="No leave requests yet." />}
          {data.leaves.map((leave) => (
            <Card key={leave._id}>
              <View style={styles.row}>
                <Text style={styles.heading}>
                  {leave.type} · {leave.days} {leave.days === 1 ? 'day' : 'days'}
                </Text>
                <StatusBadge status={leave.status} />
              </View>
              <Text style={styles.text}>
                {formatDate(leave.fromDate)}
                {leave.toDate !== leave.fromDate ? ` - ${formatDate(leave.toDate)}` : ''}
              </Text>
              <Text style={styles.muted}>{leave.reason}</Text>
              {leave.actionNote ? <Text style={styles.muted}>Admin note: {leave.actionNote}</Text> : null}
              {leave.status === 'PENDING' ? <Button label="Cancel request" variant="outline" onPress={() => cancel(leave)} /> : null}
            </Card>
          ))}
        </>
      ) : null}
    </Screen>
  );
}
