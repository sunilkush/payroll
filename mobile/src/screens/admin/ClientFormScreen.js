import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LocateFixed } from 'lucide-react-native';
import { createClientApi, getClientApi, setClientStatusApi, updateClientApi } from '../../api/endpoints';
import { Card, ErrorState, FormField, Header, MapView, Notice, PrimaryButton, Screen, SecondaryButton, SkeletonList, ToggleRow } from '../../components';
import { useLocation } from '../../hooks/useLocation';
import { colors, fonts, sizes, text } from '../../theme';

const EMPTY = { name: '', contactPerson: '', phone: '', email: '', address: '', notes: '', isActive: true };

// Admin: client jodna / badalna (POST / PUT /clients), pata aur map par pin.
// route.params: { id? (edit), returnTo? ('ScheduleMeeting': naya client bana kar wahin wapas, chuna hua) }
export default function ClientFormScreen({ navigation, route }) {
  const { id, returnTo } = route.params ?? {};
  const isEdit = Boolean(id);
  const location = useLocation({ ask: false });
  const [form, setForm] = useState(isEdit ? null : EMPTY);
  const [original, setOriginal] = useState(null);
  const [pin, setPin] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [fields, setFields] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const loadClient = async () => {
    setLoadError('');
    try {
      const { data } = await getClientApi(id);
      const client = data.client;
      setOriginal(client);
      setForm({
        name: client.name ?? '',
        contactPerson: client.contactPerson ?? '',
        phone: client.phone ?? '',
        email: client.email ?? '',
        address: client.address ?? '',
        notes: client.notes ?? '',
        isActive: client.isActive !== false,
      });
      if (client.lat != null) setPin({ lat: client.lat, lng: client.lng });
    } catch (err) {
      setLoadError(err.message);
    }
  };

  useEffect(() => {
    if (isEdit) loadClient();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (key) => (value) => {
    setForm((previous) => ({ ...previous, [key]: value }));
    setFields((previous) => ({ ...previous, [key]: undefined }));
  };

  const submit = async () => {
    if (form.name.trim().length < 2) {
      setFields({ name: 'Enter the client name.' });
      return;
    }
    setBusy(true);
    setError('');
    try {
      const payload = {
        name: form.name.trim(),
        contactPerson: form.contactPerson.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
        notes: form.notes.trim(),
        lat: pin?.lat ?? null,
        lng: pin?.lng ?? null,
      };
      let saved;
      if (isEdit) {
        saved = (await updateClientApi(id, payload)).data.client;
        if (original.isActive !== form.isActive) saved = (await setClientStatusApi(id, form.isActive)).data.client ?? saved;
      } else {
        saved = (await createClientApi(payload)).data.client;
      }
      if (returnTo === 'ScheduleMeeting') navigation.navigate('ScheduleMeeting', { client: saved });
      else navigation.navigate('Clients', { toast: isEdit ? 'Client saved.' : `${payload.name} added.` });
    } catch (err) {
      setFields(err.fields);
      setError(Object.keys(err.fields).length ? 'Some details need fixing. Check the highlighted fields.' : err.message);
      setBusy(false);
    }
  };

  const header = <Header title={isEdit ? 'Edit client' : 'Add client'} onBack={navigation.goBack} />;
  if (!form) {
    return (
      <Screen>
        {header}
        {loadError ? (
          <Card>
            <ErrorState message={loadError} onRetry={loadClient} />
          </Card>
        ) : (
          <SkeletonList rows={3} />
        )}
      </Screen>
    );
  }

  const field = (key, label, props = {}) => <FormField label={label} value={form[key]} onChangeText={set(key)} error={fields[key]} editable={!busy} {...props} />;
  const here = location.position ? { lat: location.position.lat, lng: location.position.lng } : null;

  return (
    <Screen
      footer={
        <>
          <Notice variant="danger">{error}</Notice>
          <PrimaryButton title={isEdit ? 'Save client' : 'Add client'} onPress={submit} loading={busy} />
        </>
      }
    >
      {header}
      {field('name', 'Client name', { autoCapitalize: 'words', maxLength: 150 })}
      {field('contactPerson', 'Contact person', { autoCapitalize: 'words', maxLength: 100 })}
      {field('phone', 'Phone', { keyboardType: 'phone-pad', maxLength: 15 })}
      {field('email', 'Email', { keyboardType: 'email-address', autoCapitalize: 'none', autoCorrect: false })}
      {field('address', 'Address', { multiline: true, maxLength: 300 })}

      <View style={styles.group}>
        <View style={styles.mapHead}>
          <Text style={text.label}>Location on map</Text>
          <Pressable style={styles.link} onPress={() => (here ? setPin(here) : location.refresh())} accessibilityRole="button">
            <LocateFixed size={16} strokeWidth={2} color={colors.ink} />
            <Text style={styles.linkText}>Use my location</Text>
          </Pressable>
        </View>
        <MapView height={220} center={pin ?? here ?? undefined} zoom={pin ? 17 : 14} viewKey={pin ? 'pin' : here ? 'here' : 'none'} pin={pin ?? undefined} onPinChange={setPin} />
        <Text style={fields.lat ? styles.error : text.small}>{fields.lat ?? 'Tap the map or drag the pin. Visits use this spot for check-in.'}</Text>
        {pin && <SecondaryButton title="Remove pin" onPress={() => setPin(null)} />}
      </View>

      {field('notes', 'Notes', { multiline: true, maxLength: 1000 })}

      {isEdit && (
        <Card padded={false}>
          <ToggleRow title="Active" subtitle="Inactive clients cannot get new visits" value={form.isActive} onValueChange={set('isActive')} disabled={busy} divider={false} />
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { gap: 8 },
  mapHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  link: { minHeight: sizes.touch, flexDirection: 'row', alignItems: 'center', gap: 6 },
  linkText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.ink },
  error: { fontFamily: fonts.body, fontSize: 13, color: colors.danger },
});
