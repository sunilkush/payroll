import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Building, Plus, Search } from 'lucide-react-native';
import { listClientsApi, listMeetingsApi } from '../../api/endpoints';
import { Card, EmptyState, ErrorState, Header, Pill, Screen, SkeletonList, Toast } from '../../components';
import { colors, fonts, radius, sizes, spacing, text } from '../../theme';
import { formatDate } from '../../utils/format';
import { OPEN_STATUSES } from '../../utils/meeting';

// Client wise visits: kitni, aakhri poori hui kab, agli kab. Server client par ye nahi rakhta, isliye haal ki
// 100 meetings se nikalte hain (purane clients ki ginti isse kam dikh sakti hai).
function visitsByClient(meetings) {
  const map = new Map();
  const now = Date.now();
  for (const meeting of meetings) {
    const id = meeting.clientId?._id;
    if (!id) continue;
    const entry = map.get(id) ?? { count: 0, last: null, next: null };
    if (meeting.status !== 'CANCELLED') entry.count += 1;
    if (meeting.status === 'COMPLETED' && (!entry.last || meeting.date > entry.last)) entry.last = meeting.date;
    if (OPEN_STATUSES.includes(meeting.status) && new Date(meeting.endAt).getTime() > now && (!entry.next || meeting.startAt < entry.next)) entry.next = meeting.startAt;
    map.set(id, entry);
  }
  return map;
}

// Admin: clients ki list. route.params.toast: form se wapas aane par.
export default function ClientsScreen({ navigation, route }) {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [state, setState] = useState({ items: null, error: '' });
  const [visits, setVisits] = useState(new Map());
  const toast = route.params?.toast ?? '';
  const hideToast = useCallback(() => navigation.setParams({ toast: undefined }), [navigation]);

  useEffect(() => {
    const timer = setTimeout(() => setQuery(search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    try {
      const res = await listClientsApi({ search: query.trim() || undefined, limit: 100 });
      setState({ items: res.data.items, error: '' });
    } catch (err) {
      setState((previous) => ({ ...previous, error: err.message }));
    }
    listMeetingsApi({ limit: 100 })
      .then((res) => setVisits(visitsByClient(res.data.items)))
      .catch(() => {});
  }, [query]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <Screen onRefresh={load} overlay={<Toast message={toast} onHide={hideToast} />}>
      <Header
        title="Clients"
        onBack={navigation.goBack}
        right={
          <Pressable style={styles.add} onPress={() => navigation.navigate('ClientForm')} accessibilityRole="button">
            <Plus size={18} strokeWidth={2} color={colors.onInk} />
            <Text style={styles.addText}>Add</Text>
          </Pressable>
        }
      />

      <View style={styles.search}>
        <Search size={18} strokeWidth={1.8} color={colors.muted} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search name, contact or phone"
          placeholderTextColor={colors.muted}
          autoCorrect={false}
          accessibilityLabel="Search clients"
        />
      </View>

      {state.error && !state.items ? (
        <Card>
          <ErrorState message={state.error} onRetry={load} />
        </Card>
      ) : !state.items ? (
        <SkeletonList rows={4} />
      ) : !state.items.length ? (
        <Card>
          <EmptyState icon={Building} title={query ? 'No client matches' : 'No clients yet'} message={query ? 'Try another name.' : 'Add the businesses your team visits.'} />
        </Card>
      ) : (
        state.items.map((client) => {
          const info = visits.get(client._id) ?? { count: 0 };
          const line = [info.last && `Last visit ${formatDate(info.last)}`, info.next && `Next ${formatDate(info.next)}`].filter(Boolean).join(' · ') || 'No visits yet';
          return (
            <Pressable key={client._id} onPress={() => navigation.navigate('ClientForm', { id: client._id })} accessibilityRole="button">
              <Card>
                <View style={styles.top}>
                  <Text style={[text.heading, styles.flex]} numberOfLines={1}>
                    {client.name}
                  </Text>
                  {!client.isActive && <Pill variant="danger">Inactive</Pill>}
                  <Text style={styles.count} accessibilityLabel={`${info.count} visits`}>
                    {info.count}
                  </Text>
                </View>
                {client.address ? <Text style={text.small}>{client.address}</Text> : null}
                <View style={styles.bottom}>
                  <Text style={[text.small, styles.flex]}>{line}</Text>
                  {client.isActive && (
                    <Pressable style={styles.link} onPress={() => navigation.navigate('ScheduleMeeting', { client })} accessibilityRole="link">
                      <Text style={styles.linkText}>Schedule</Text>
                    </Pressable>
                  )}
                </View>
              </Card>
            </Pressable>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  add: { minHeight: sizes.touch, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, borderRadius: radius.pill, backgroundColor: colors.ink },
  addText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.onInk },
  search: {
    minHeight: sizes.input,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radius.input,
  },
  searchInput: { flex: 1, minHeight: sizes.input, fontFamily: fonts.body, fontSize: 15, color: colors.ink },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.gap },
  count: { fontFamily: fonts.monoSemiBold, fontSize: 18, color: colors.ink },
  bottom: { flexDirection: 'row', alignItems: 'center', gap: spacing.gap },
  link: { minHeight: sizes.touch, justifyContent: 'center' },
  linkText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.success },
});
