import { useState } from 'react';
import { Alert, Text, TextInput, View } from 'react-native';
import { colors, space } from '../theme.js';
import { useLoad } from '../utils/useLoad.js';
import { Button, Card, Empty, Screen, styles } from './ui.js';

// Admin ki pending requests (leave / punch correction) ki list, har ek par Approve / Reject.
//   fetchPending   () => Promise<items>
//   approve/reject (id, note) => Promise
//   renderBody     (item) => request ki detail
export default function ApprovalList({ title, emptyText, fetchPending, approve, reject, renderBody }) {
  const { data: items, error, loading, refreshing, refresh, reload } = useLoad(fetchPending);
  const [notes, setNotes] = useState({}); // { [id]: note }
  const [busy, setBusy] = useState(null); // { id, action }

  async function decide(item, action) {
    setBusy({ id: item._id, action });
    try {
      await (action === 'approve' ? approve : reject)(item._id, notes[item._id]?.trim() ?? '');
      await reload();
    } catch (err) {
      Alert.alert('Could not save', err.message);
    } finally {
      setBusy(null);
    }
  }

  const isBusy = (item, action) => busy?.id === item._id && busy.action === action;

  return (
    <Screen title={title} loading={loading} refreshing={refreshing} onRefresh={refresh} error={error}>
      {items && !items.length ? <Empty text={emptyText} /> : null}
      {(items ?? []).map((item) => (
        <Card key={item._id}>
          <Text style={styles.heading}>
            {item.userId?.name ?? 'Staff'}
            {item.userId?.employeeCode ? ` (${item.userId.employeeCode})` : ''}
          </Text>
          {renderBody(item)}
          <Text style={styles.muted}>Reason: {item.reason}</Text>
          <TextInput
            style={styles.input}
            value={notes[item._id] ?? ''}
            onChangeText={(note) => setNotes((previous) => ({ ...previous, [item._id]: note }))}
            placeholder="Note (optional)"
            placeholderTextColor={colors.textMuted}
            maxLength={300}
          />
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Button
              label="Reject"
              variant="outline"
              onPress={() => decide(item, 'reject')}
              loading={isBusy(item, 'reject')}
              disabled={Boolean(busy)}
              style={{ flex: 1 }}
            />
            <Button
              label="Approve"
              onPress={() => decide(item, 'approve')}
              loading={isBusy(item, 'approve')}
              disabled={Boolean(busy)}
              style={{ flex: 1 }}
            />
          </View>
        </Card>
      ))}
    </Screen>
  );
}
