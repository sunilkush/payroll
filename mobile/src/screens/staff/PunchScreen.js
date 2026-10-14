import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, CircleCheck, CircleX, LocateFixed, MapPinOff, Satellite } from 'lucide-react-native';
import { punchInApi, punchOutApi } from '../../api/endpoints';
import { Card, ErrorState, ListRow, MapView, Notice, PrimaryButton, SecondaryButton, Skeleton, StatTile } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from '../../hooks/useLocation';
import { useToday } from '../../hooks/useToday';
import { colors, fonts, radius, sizes, spacing, text } from '../../theme';
import { punchesOf } from '../../utils/attendance';
import { formatTime } from '../../utils/format';
import { formatDistance, nearestLocation } from '../../utils/geo';
import { getMaxGpsAccuracy, learnMaxGpsAccuracy } from '../../utils/gpsLimit';

const NO_NETWORK = 'No internet connection. Your punch was not recorded. Try again when you are back online.';

// Bade gol icon ke saath sheet ka sar: hara (andar), laal (mana), amber (GPS kamzor), neutral.
function SheetTitle({ icon: Icon, tone, title, subtitle }) {
  const palette = {
    success: [colors.successTint, colors.success],
    danger: [colors.dangerTint, colors.danger],
    warning: [colors.warningTint, colors.warning],
    neutral: [colors.neutralTint, colors.neutral],
  }[tone];
  return (
    <View style={styles.sheetTitle}>
      <View style={[styles.sheetIcon, { backgroundColor: palette[0] }]}>
        <Icon size={24} strokeWidth={2} color={palette[1]} />
      </View>
      <View style={styles.flex}>
        <Text style={text.heading}>{title}</Text>
        {subtitle ? <Text style={text.small}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

// Punch: map par office, uski range (gola) aur aap. Andar hon to Confirm; server time likhta hai aur har koshish log karta hai.
export default function PunchScreen({ navigation }) {
  const { hasFeature } = useAuth();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const today = useToday({ resync: false });
  const location = useLocation({ ask: true, watch: true });
  const [maxAccuracy, setMaxAccuracy] = useState(getMaxGpsAccuracy);
  const [busy, setBusy] = useState(false);
  // Server ka mana kiya hua punch: { message, serverTime, geo, position }
  const [rejected, setRejected] = useState(null);
  // Baaki errors (network, dobara punch, kamzor GPS...): { message, variant }
  const [problem, setProblem] = useState(null);

  const data = today.data;
  const locations = data?.locations ?? [];
  const working = Boolean(data?.metrics?.isCurrentlyWorking);
  const action = working ? 'Punch Out' : 'Punch In';
  const { position } = location;
  const geo = position && locations.length ? nearestLocation(locations, position) : null;
  const weakGps = Boolean(position && position.accuracy > maxAccuracy);
  // Phone ke hisaab se bahar (server bhi yahi kahega) ya server ne mana kiya
  const outside = Boolean(rejected || (geo && !geo.inside && !weakGps));
  const shown = rejected ?? (outside ? { geo, position } : null);
  const focus = geo?.location ?? locations[0];

  const tryAgain = () => {
    setRejected(null);
    setProblem(null);
    location.refresh();
  };

  const confirm = async () => {
    if (!position || busy) return;
    const attempt = { ...position };
    setBusy(true);
    setProblem(null);
    try {
      const res = await (working ? punchOutApi(attempt) : punchInApi(attempt));
      const punches = punchesOf(res.data.attendance);
      const at = punches[punches.length - 1]?.time ?? res.serverTime;
      navigation.navigate('Tabs', { screen: 'Home', params: { toast: `${working ? 'Punched out' : 'Punched in'} at ${formatTime(at)}` } });
    } catch (err) {
      if (!err.status) {
        setProblem({ message: NO_NETWORK, variant: 'danger' });
      } else if (err.status === 403) {
        // Range ke bahar, ya chhutti / weekly off / working hours: server ne mana kiya aur koshish log ki.
        setRejected({ message: err.message, serverTime: err.serverTime, geo: nearestLocation(locations, attempt), position: attempt });
      } else if (err.status === 400 && learnMaxGpsAccuracy(err.message)) {
        setMaxAccuracy(getMaxGpsAccuracy());
        setProblem({ message: err.message, variant: 'warning' });
      } else {
        // 409: pehle hi punch ho chuka (doosre phone / tab se). Haalat taaza karo taaki button sahi ho.
        if (err.status === 409) today.reload();
        setProblem({ message: err.message, variant: 'danger' });
      }
    } finally {
      setBusy(false);
    }
  };

  // ---------- Map ----------
  const mapHeight = Math.round(height * 0.58);
  const circles = locations.map((place) => ({ lat: place.lat, lng: place.lng, radius: place.radius, tone: 'success', dashed: true }));
  const markers = locations.map((place) => ({ lat: place.lat, lng: place.lng, label: place.name }));
  const mapUser = shown?.position ?? position;
  // Range ke bahar: laal dot + office tak dashed laal line, doori ke saath. (Chhutti / working hours wala mana andar bhi ho sakta hai.)
  const away = Boolean(shown?.geo && !shown.geo.inside);
  const lines = away
    ? [{ from: shown.position, to: shown.geo.location, tone: 'danger', dashed: true, label: formatDistance(shown.geo.distance) }]
    : undefined;

  // ---------- Sheet ----------
  const renderSheet = () => {
    if (today.loading && !data) {
      return (
        <View style={styles.gap}>
          <Skeleton height={52} />
          <Skeleton height={80} />
          <Skeleton height={sizes.button} borderRadius={radius.button} />
        </View>
      );
    }
    if (!data) return <ErrorState message={today.error} onRetry={today.reload} />;
    if (!locations.length) {
      return <SheetTitle icon={MapPinOff} tone="neutral" title="No office location set" subtitle="Ask your admin to add your office on the map." />;
    }

    if (location.status === 'denied' || location.status === 'off') {
      const off = location.status === 'off';
      const canAsk = !off && location.canAskAgain;
      return (
        <View style={styles.gap}>
          <SheetTitle
            icon={MapPinOff}
            tone="warning"
            title={off ? 'Location is turned off' : 'Allow location to punch'}
            subtitle={
              off
                ? 'Turn on location (GPS) on your phone so we can check that you are at the office.'
                : 'We check your location only when you punch, to confirm you are at the office. It is not tracked in the background.'
            }
          />
          <PrimaryButton title={canAsk ? 'Allow location' : 'Open settings'} onPress={canAsk ? location.refresh : location.openSettings} />
        </View>
      );
    }
    if (location.status === 'error') {
      return (
        <View style={styles.gap}>
          <SheetTitle icon={MapPinOff} tone="warning" title="Could not find you" subtitle={location.error} />
          <PrimaryButton title="Refresh location" icon={LocateFixed} onPress={location.refresh} />
        </View>
      );
    }
    if (!position) {
      return (
        <View style={styles.gap}>
          <SheetTitle icon={LocateFixed} tone="neutral" title="Finding your location…" subtitle="Stay still for a moment. Open sky helps." />
          <Skeleton height={80} />
        </View>
      );
    }

    if (shown) {
      const place = shown.geo?.location;
      return (
        <View style={styles.gap}>
          <SheetTitle icon={CircleX} tone="danger" title="Punch not accepted" />
          <Notice variant="danger">
            {rejected?.message ??
              `You are ${formatDistance(shown.geo.distance)} from ${place.name}. Move inside the ${place.radius} m range to punch.`}
          </Notice>
          <Card padded={false}>
            {place && <ListRow title="Nearest branch" value={place.name} mono={false} />}
            {shown.geo && (
              <ListRow
                title="Distance"
                right={
                  <Text style={[text.mono, !shown.geo.inside && styles.danger]}>
                    {formatDistance(shown.geo.distance)} / {place.radius} m
                  </Text>
                }
              />
            )}
            <ListRow title="GPS accuracy" value={`±${shown.position.accuracy} m`} divider={Boolean(rejected)} />
            {rejected && <ListRow title="Attempt logged" subtitle="Server time" value={formatTime(rejected.serverTime)} divider={false} />}
          </Card>
          <Notice variant={problem?.variant}>{problem?.message}</Notice>
          <PrimaryButton title="Try again" onPress={tryAgain} />
          {hasFeature('corrections') && (
            <SecondaryButton title="Request punch correction" onPress={() => navigation.navigate('PunchCorrection')} />
          )}
        </View>
      );
    }

    const distanceTile = geo ? `${formatDistance(geo.distance)} / ${geo.location.radius} m` : '-';
    return (
      <View style={styles.gap}>
        {weakGps ? (
          <SheetTitle
            icon={Satellite}
            tone="warning"
            title="Move to open sky"
            subtitle={`Your GPS is not accurate enough yet (±${position.accuracy} m). Step outside or near a window and wait a few seconds.`}
          />
        ) : (
          <SheetTitle icon={CircleCheck} tone="success" title="You're inside the office" subtitle={geo.location.name} />
        )}
        <View style={styles.tiles}>
          <StatTile value={distanceTile} label="Distance" />
          <StatTile value={`±${position.accuracy} m`} label={`GPS accuracy (max ${maxAccuracy})`} tone={weakGps ? 'warning' : undefined} />
        </View>
        <Text style={text.small}>Punch time is recorded by the server, not your phone. Every attempt is logged.</Text>
        <Notice variant={problem?.variant}>{problem?.message}</Notice>
        <PrimaryButton title={`Confirm ${action}`} onPress={confirm} loading={busy} disabled={weakGps || location.locating} />
        <SecondaryButton title="Refresh location" icon={LocateFixed} onPress={location.refresh} loading={location.locating} disabled={busy} />
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <MapView
        height={mapHeight}
        rounded={false}
        center={focus ? { lat: focus.lat, lng: focus.lng } : undefined}
        zoom={17}
        fit={away}
        viewKey={away ? 'outside' : 'office'}
        markers={markers}
        circles={circles}
        lines={lines}
        user={mapUser ? { lat: mapUser.lat, lng: mapUser.lng, tone: away ? 'danger' : undefined } : undefined}
      />

      <View style={[styles.mapBar, { top: insets.top + 8 }]} pointerEvents="box-none">
        <Pressable style={styles.back} onPress={navigation.goBack} accessibilityRole="button" accessibilityLabel="Go back">
          <ArrowLeft size={20} strokeWidth={2} color={colors.ink} />
        </Pressable>
        {focus && (
          <View style={styles.mapChip}>
            <Text style={styles.mapChipText} numberOfLines={1}>
              {focus.name} · radius <Text style={styles.mapChipMono}>{focus.radius} m</Text>
            </Text>
          </View>
        )}
      </View>

      <ScrollView
        style={styles.sheet}
        contentContainerStyle={[styles.sheetContent, { paddingBottom: insets.bottom + spacing.gapLg }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.handle} />
        {renderSheet()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  flex: { flex: 1 },
  gap: { gap: spacing.gap },
  mapBar: { position: 'absolute', left: spacing.screen, right: spacing.screen, flexDirection: 'row', alignItems: 'center', gap: spacing.gap },
  back: {
    width: sizes.touch,
    height: sizes.touch,
    borderRadius: sizes.touch / 2,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapChip: { flexShrink: 1, backgroundColor: colors.card, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14, paddingVertical: 10 },
  mapChipText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.ink },
  mapChipMono: { fontFamily: fonts.mono },
  sheet: { flex: 1, marginTop: -radius.hero, backgroundColor: colors.paper, borderTopLeftRadius: radius.hero, borderTopRightRadius: radius.hero },
  sheetContent: { padding: spacing.screen, paddingTop: 10, gap: spacing.gap },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: radius.pill, backgroundColor: colors.inputBorder, marginBottom: 4 },
  sheetTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.gap },
  sheetIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  tiles: { flexDirection: 'row', gap: spacing.gap },
  danger: { color: colors.danger },
});
