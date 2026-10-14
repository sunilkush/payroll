import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { ChevronDown, LocateFixed, Plus, Search } from 'lucide-react-native';
import { createMeetingApi, listClientsApi, listStaffApi } from '../../api/endpoints';
import { BottomSheet, Card, EmptyState, FormField, Header, ListRow, MapView, Notice, PickerField, PrimaryButton, Screen, SecondaryButton } from '../../components';
import { useLocation } from '../../hooks/useLocation';
import { useMeetingGrace } from '../../hooks/useMeetingGrace';
import { colors, fonts, radius, sizes, spacing, text } from '../../theme';
import { todayStr } from '../../utils/format';

const RADIUS_MIN = 50;
const RADIUS_MAX = 500;

const minutesOf = (time) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
const pad = (value) => String(value).padStart(2, '0');
const addHour = (time) => {
  const total = Math.min(minutesOf(time) + 60, 23 * 60 + 59);
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
};
// Abhi ka time, agle 15 minute tak upar (10:50 -> 11:00)
const nowTime = () => {
  const now = new Date();
  const total = Math.min(Math.ceil((now.getHours() * 60 + now.getMinutes()) / 15) * 15, 23 * 60 + 45);
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
};

// Client chunne ki sheet: search + list + naya client.
function ClientPicker({ visible, onClose, onPick, onNew }) {
  const [search, setSearch] = useState('');
  const [items, setItems] = useState(null);

  useEffect(() => {
    if (!visible) return undefined;
    const timer = setTimeout(() => {
      listClientsApi({ status: 'active', search: search.trim() || undefined, limit: 50 })
        .then((res) => setItems(res.data.items))
        .catch(() => setItems([]));
    }, 300);
    return () => clearTimeout(timer);
  }, [visible, search]);

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Choose client">
      <View style={styles.search}>
        <Search size={18} strokeWidth={1.8} color={colors.muted} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search clients"
          placeholderTextColor={colors.muted}
          accessibilityLabel="Search clients"
        />
      </View>
      <SecondaryButton title="New client" icon={Plus} onPress={onNew} />
      <Card padded={false}>
        {!items?.length ? (
          <EmptyState title={items ? 'No clients found' : 'Loading…'} />
        ) : (
          items.map((client, index) => (
            <ListRow
              key={client._id}
              title={client.name}
              subtitle={client.address || (client.lat == null ? 'No location saved' : undefined)}
              onPress={() => onPick(client)}
              divider={index < items.length - 1}
            />
          ))
        )}
      </Card>
    </BottomSheet>
  );
}

// Admin: client visit schedule karna (POST /meetings). route.params: { client? (Clients se), date? }
export default function ScheduleMeetingScreen({ navigation, route }) {
  const grace = useMeetingGrace();
  const location = useLocation({ ask: false });
  const [client, setClient] = useState(route.params?.client ?? null);
  const [managers, setManagers] = useState(null);
  const [managerId, setManagerId] = useState('');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(route.params?.date ?? todayStr());
  const [start, setStart] = useState(nowTime);
  const [end, setEnd] = useState(() => addHour(nowTime()));
  const [pin, setPin] = useState(null);
  const [radiusM, setRadiusM] = useState(100);
  const [picking, setPicking] = useState(false);
  const [fields, setFields] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Naya client form se wapas aaya
  useEffect(() => {
    if (route.params?.client) setClient(route.params.client);
  }, [route.params?.client]);

  // Client badla: uski saved location par pin
  useEffect(() => {
    if (client?.lat != null) setPin({ lat: client.lat, lng: client.lng });
    setFields((previous) => ({ ...previous, clientId: undefined, 'location.lat': undefined }));
  }, [client]);

  useEffect(() => {
    listStaffApi({ status: 'active', salesManager: true, limit: 100 })
      .then((res) => {
        setManagers(res.data.items);
        if (res.data.items.length === 1) setManagerId(res.data.items[0]._id);
      })
      .catch(() => setManagers([]));
  }, []);

  const useMyLocation = useCallback(() => {
    if (location.position) setPin({ lat: location.position.lat, lng: location.position.lng });
    else location.refresh();
  }, [location]);

  const manager = managers?.find((person) => person._id === managerId);

  const submit = async () => {
    const problems = {};
    if (!client) problems.clientId = 'Choose a client.';
    if (!managerId) problems.salesManagerId = 'Choose who will visit.';
    if (date < todayStr()) problems.date = 'The date cannot be in the past.';
    if (minutesOf(end) <= minutesOf(start)) problems.endTime = 'End time must be after the start time.';
    if (date === todayStr() && minutesOf(end) <= minutesOf(nowTime())) problems.endTime = 'This time has already passed today.';
    if (!pin) problems['location.lat'] = 'Set the meeting location on the map.';
    setFields(problems);
    if (Object.keys(problems).length) return;

    setBusy(true);
    setError('');
    try {
      const res = await createMeetingApi({
        clientId: client._id,
        salesManagerId: managerId,
        title: title.trim() || `Visit to ${client.name}`,
        date,
        startTime: start,
        endTime: end,
        location: { name: client.name, address: client.address ?? '', lat: pin.lat, lng: pin.lng, radius: Math.round(radiusM) },
      });
      navigation.replace('MeetingDetail', { id: res.data.meeting._id, justCreated: true });
    } catch (err) {
      setFields(err.fields);
      if (!Object.keys(err.fields).length) setError(err.message);
      else setError('Some details need fixing. Check the highlighted fields.');
      setBusy(false);
    }
  };

  return (
    <Screen
      footer={
        <>
          <Notice variant="danger">{error}</Notice>
          <PrimaryButton title={manager ? `Schedule for ${manager.name.split(' ')[0]}` : 'Schedule visit'} onPress={submit} loading={busy} />
        </>
      }
    >
      <Header title="Schedule a visit" onBack={navigation.goBack} />

      <View style={styles.group}>
        <Text style={text.label}>Client</Text>
        <Pressable style={[styles.select, fields.clientId && styles.invalid]} onPress={() => setPicking(true)} accessibilityRole="button" accessibilityLabel={`Client: ${client?.name ?? 'not chosen'}`}>
          <View style={styles.flex}>
            <Text style={[text.body, !client && styles.placeholder]}>{client?.name ?? 'Choose a client'}</Text>
            {client?.address ? <Text style={text.small} numberOfLines={1}>{client.address}</Text> : null}
          </View>
          <ChevronDown size={20} strokeWidth={1.8} color={colors.muted} />
        </Pressable>
        {fields.clientId ? <Text style={styles.error}>{fields.clientId}</Text> : null}
      </View>

      <View style={styles.group}>
        <Text style={text.label}>Assign to</Text>
        {managers && !managers.length ? (
          <Notice variant="warning">No field sales staff yet. Turn on "Field sales" for a staff member in the Staff tab.</Notice>
        ) : (
          <View style={styles.chips}>
            {(managers ?? []).map((person) => {
              const selected = person._id === managerId;
              return (
                <Pressable
                  key={person._id}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => {
                    setManagerId(person._id);
                    setFields((previous) => ({ ...previous, salesManagerId: undefined }));
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{person.name}</Text>
                </Pressable>
              );
            })}
          </View>
        )}
        {fields.salesManagerId ? <Text style={styles.error}>{fields.salesManagerId}</Text> : null}
      </View>

      <FormField label="Title" value={title} onChangeText={setTitle} placeholder={client ? `Visit to ${client.name}` : 'Visit to client'} maxLength={150} error={fields.title} />

      <View style={styles.row}>
        <PickerField label="Date" mode="date" value={date} min={todayStr()} onChange={setDate} error={fields.date} />
      </View>
      <View style={styles.row}>
        <PickerField
          label="Start"
          mode="time"
          value={start}
          onChange={(value) => {
            setStart(value);
            if (minutesOf(end) <= minutesOf(value)) setEnd(addHour(value));
          }}
          error={fields.startTime}
        />
        <PickerField label="End" mode="time" value={end} onChange={setEnd} error={fields.endTime} />
      </View>
      <Text style={text.small}>
        Check-in opens <Text style={styles.mono}>{grace} min</Text> before · Closes <Text style={styles.mono}>{grace} min</Text> after. Change it in
        Configuration (same for all visits).
      </Text>

      <View style={styles.group}>
        <View style={styles.mapHead}>
          <Text style={text.label}>Meeting location</Text>
          <Pressable style={styles.link} onPress={useMyLocation} accessibilityRole="button">
            <LocateFixed size={16} strokeWidth={2} color={colors.ink} />
            <Text style={styles.linkText}>Use my location</Text>
          </Pressable>
        </View>
        <MapView
          height={240}
          center={pin ?? (location.position ? { lat: location.position.lat, lng: location.position.lng } : undefined)}
          zoom={pin ? 17 : 14}
          viewKey={pin ? `${client?._id ?? 'pin'}` : 'none'}
          pin={pin ?? undefined}
          onPinChange={(next) => {
            setPin(next);
            setFields((previous) => ({ ...previous, 'location.lat': undefined }));
          }}
          circles={pin ? [{ lat: pin.lat, lng: pin.lng, radius: radiusM, tone: 'success', dashed: true }] : undefined}
        />
        <Text style={fields['location.lat'] ? styles.error : text.small}>
          {fields['location.lat'] ?? 'Tap the map or drag the pin to the client’s door.'}
        </Text>
        <View style={styles.sliderRow}>
          <Text style={text.label}>Check-in radius</Text>
          <Text style={styles.mono}>{Math.round(radiusM)} m</Text>
        </View>
        <Slider
          minimumValue={RADIUS_MIN}
          maximumValue={RADIUS_MAX}
          step={10}
          value={radiusM}
          onValueChange={setRadiusM}
          minimumTrackTintColor={colors.success}
          maximumTrackTintColor={colors.track}
          thumbTintColor={colors.ink}
          accessibilityLabel="Check-in radius in metres"
        />
      </View>

      <ClientPicker
        visible={picking}
        onClose={() => setPicking(false)}
        onPick={(picked) => {
          setClient(picked);
          setPicking(false);
        }}
        onNew={() => {
          setPicking(false);
          navigation.navigate('ClientForm', { returnTo: 'ScheduleMeeting' });
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  group: { gap: 8 },
  row: { flexDirection: 'row', gap: spacing.gap },
  select: {
    minHeight: sizes.input + 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radius.input,
  },
  invalid: { borderColor: colors.danger },
  placeholder: { color: colors.muted },
  error: { fontFamily: fonts.body, fontSize: 13, color: colors.danger },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: sizes.touch, justifyContent: 'center', paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.inputBorder, backgroundColor: colors.card },
  chipSelected: { borderColor: colors.success, backgroundColor: colors.successTint },
  chipText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.ink },
  chipTextSelected: { fontFamily: fonts.bodySemiBold, color: colors.successDark },
  mono: { fontFamily: fonts.mono, color: colors.ink },
  mapHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  link: { minHeight: sizes.touch, flexDirection: 'row', alignItems: 'center', gap: 6 },
  linkText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.ink },
  sliderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
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
});
