import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { LocateFixed, Plus } from 'lucide-react-native';
import { Card, ErrorState, FormField, Header, MapView, NumberStepper, Notice, PrimaryButton, Screen, SecondaryButton, SkeletonList, Toast, useToast } from '../../components';
import { useCompanySettings, useUnsavedGuard } from '../../hooks/useCompanySettings';
import { useLocation } from '../../hooks/useLocation';
import { colors, fonts, radius, sizes, spacing, text } from '../../theme';

const RADIUS_MIN = 50;
const RADIUS_MAX = 500;
const round6 = (value) => Math.round(value * 1e6) / 1e6;

const fromCompany = (company) => ({
  locations: company.locations.map(({ _id, name, lat, lng, radius: r }) => ({ _id, name, lat, lng, radius: r })),
  maxGpsAccuracy: company.settings.maxGpsAccuracy,
});

// Admin: office / branch ki jagah, punch ki range (geofence) aur GPS ki hadd.
export default function OfficesScreen({ navigation }) {
  const { company, error: loadError, reload, save } = useCompanySettings();
  const location = useLocation({ ask: false });
  const [draft, setDraft] = useState(null);
  const [selected, setSelected] = useState(0);
  const [fields, setFields] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast, hideToast] = useToast();

  useEffect(() => {
    if (company && !draft) setDraft(fromCompany(company));
  }, [company, draft]);

  const baseline = company ? fromCompany(company) : null;
  const locationsChanged = draft && JSON.stringify(draft.locations) !== JSON.stringify(baseline.locations);
  const gpsChanged = draft && draft.maxGpsAccuracy !== baseline.maxGpsAccuracy;
  useUnsavedGuard(Boolean(locationsChanged || gpsChanged) && !busy);

  if (!draft) {
    return (
      <Screen>
        <Header title="Offices & geofence" onBack={navigation.goBack} />
        {loadError ? <ErrorState message={loadError} onRetry={reload} /> : <SkeletonList rows={3} />}
      </Screen>
    );
  }

  const branch = draft.locations[selected];
  const here = location.position ? { lat: round6(location.position.lat), lng: round6(location.position.lng) } : null;

  const update = (changes) => {
    setDraft((previous) => ({ ...previous, locations: previous.locations.map((item, index) => (index === selected ? { ...item, ...changes } : item)) }));
    setFields({});
  };

  const addBranch = () => {
    const start = here ?? (branch ? { lat: branch.lat, lng: branch.lng } : { lat: 28.6139, lng: 77.209 });
    setDraft((previous) => ({ ...previous, locations: [...previous.locations, { name: previous.locations.length ? `Branch ${previous.locations.length + 1}` : 'Head Office', ...start, radius: 150 }] }));
    setSelected(draft.locations.length);
  };

  const removeBranch = () => {
    setDraft((previous) => ({ ...previous, locations: previous.locations.filter((_, index) => index !== selected) }));
    setSelected(0);
  };

  const submit = async () => {
    const problems = {};
    draft.locations.forEach((item, index) => {
      if (item.name.trim().length < 2) problems[`locations.${index}.name`] = 'Enter the branch name.';
    });
    setFields(problems);
    if (Object.keys(problems).length) {
      setError('Every branch needs a name.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const payload = {};
      if (locationsChanged) payload.locations = draft.locations.map((item) => ({ ...item, name: item.name.trim(), lat: round6(item.lat), lng: round6(item.lng) }));
      if (gpsChanged) payload.settings = { maxGpsAccuracy: draft.maxGpsAccuracy };
      const saved = await save(payload);
      setDraft(fromCompany(saved));
      setToast('Offices saved.');
    } catch (err) {
      setFields(err.fields);
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const nameError = fields[`locations.${selected}.name`];

  return (
    <Screen
      overlay={<Toast message={toast} onHide={hideToast} />}
      footer={
        <>
          <Notice variant="danger">{error}</Notice>
          <PrimaryButton title="Save" onPress={submit} loading={busy} disabled={!locationsChanged && !gpsChanged} />
        </>
      }
    >
      <Header title="Offices & geofence" onBack={navigation.goBack} />
      {!draft.locations.length && <Notice variant="warning">Add at least one office. Staff can punch in only inside a branch's range.</Notice>}

      <MapView
        height={230}
        center={branch ? { lat: branch.lat, lng: branch.lng } : here ?? undefined}
        zoom={17}
        viewKey={`branch-${selected}-${draft.locations.length}`}
        pin={branch ? { lat: branch.lat, lng: branch.lng } : undefined}
        onPinChange={branch ? (next) => update({ lat: round6(next.lat), lng: round6(next.lng) }) : undefined}
        circles={draft.locations.map((item, index) => ({ lat: item.lat, lng: item.lng, radius: item.radius, tone: index === selected ? 'success' : 'info', dashed: index !== selected }))}
        user={here ?? undefined}
      />

      <View style={styles.chips}>
        {draft.locations.map((item, index) => {
          const isSelected = index === selected;
          return (
            <Pressable key={item._id ?? `new-${index}`} style={[styles.chip, isSelected && styles.chipSelected]} onPress={() => setSelected(index)} accessibilityRole="tab" accessibilityState={{ selected: isSelected }}>
              <Text style={[styles.chipText, isSelected && styles.onDark]} numberOfLines={1}>
                {item.name || 'New branch'} · <Text style={styles.mono}>{item.radius} m</Text>
              </Text>
            </Pressable>
          );
        })}
        <Pressable style={[styles.chip, styles.addChip]} onPress={addBranch} accessibilityRole="button" accessibilityLabel="Add branch" disabled={draft.locations.length >= 20}>
          <Plus size={16} strokeWidth={2} color={colors.ink} />
        </Pressable>
      </View>

      {branch && (
        <Card>
          <FormField label="Branch name" value={branch.name} onChangeText={(name) => update({ name })} error={nameError} maxLength={100} editable={!busy} />
          <View style={styles.coords}>
            <View style={styles.flex}>
              <Text style={text.small}>Latitude</Text>
              <Text style={styles.coord}>{branch.lat.toFixed(6)}</Text>
            </View>
            <View style={styles.flex}>
              <Text style={text.small}>Longitude</Text>
              <Text style={styles.coord}>{branch.lng.toFixed(6)}</Text>
            </View>
          </View>
          <SecondaryButton
            title="Use my location"
            icon={LocateFixed}
            onPress={() => (here ? update(here) : location.refresh())}
            loading={location.locating}
          />
          <Text style={text.small}>Or tap the map / drag the pin to the office entrance.</Text>
          <View style={styles.sliderHead}>
            <Text style={text.label}>Punch radius</Text>
            <Text style={styles.mono}>{branch.radius} m</Text>
          </View>
          <Slider
            minimumValue={RADIUS_MIN}
            maximumValue={RADIUS_MAX}
            step={10}
            value={Math.min(RADIUS_MAX, Math.max(RADIUS_MIN, branch.radius))}
            onValueChange={(value) => update({ radius: Math.round(value) })}
            minimumTrackTintColor={colors.success}
            maximumTrackTintColor={colors.track}
            thumbTintColor={colors.ink}
            accessibilityLabel="Punch radius in metres"
          />
          <SecondaryButton title="Remove this branch" danger onPress={removeBranch} disabled={busy} />
        </Card>
      )}

      <Card>
        <View style={styles.gpsRow}>
          <View style={styles.flex}>
            <Text style={text.bodySemiBold}>Max GPS accuracy</Text>
            <Text style={text.small}>All branches. Punches with weaker GPS are refused.</Text>
          </View>
          <NumberStepper
            value={draft.maxGpsAccuracy}
            onChange={(value) => setDraft((previous) => ({ ...previous, maxGpsAccuracy: value }))}
            step={10}
            min={10}
            max={1000}
            format={(value) => `${value} m`}
            label="Max GPS accuracy"
          />
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: sizes.touch, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, maxWidth: '100%' },
  chipSelected: { backgroundColor: colors.ink, borderColor: colors.ink },
  addChip: { width: sizes.touch, paddingHorizontal: 0, borderStyle: 'dashed', borderColor: colors.inputBorder },
  chipText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.ink },
  onDark: { color: colors.onInk },
  mono: { fontFamily: fonts.mono },
  coords: { flexDirection: 'row', gap: spacing.gap },
  coord: { fontFamily: fonts.mono, fontSize: 15, color: colors.ink },
  sliderHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  gpsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.gap },
});
