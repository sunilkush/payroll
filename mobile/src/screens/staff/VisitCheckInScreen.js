import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { ArrowLeft, CameraOff } from 'lucide-react-native';
import { checkInMeetingApi, scanMeetingApi } from '../../api/endpoints';
import { SecondaryButton, Stepper } from '../../components';
import { useLocation } from '../../hooks/useLocation';
import { colors, fonts, radius, sizes, spacing, text } from '../../theme';
import { formatTime } from '../../utils/format';
import { distanceInMeters, formatDistance } from '../../utils/geo';
import { getMaxGpsAccuracy } from '../../utils/gpsLimit';
import { checkInWindow, saveVisitProgress } from '../../utils/visit';

const BACKGROUND = '#0E1014';
const STEPS = ['Location', 'Scan QR', 'Selfie'];
const FRAME = 240;

const tones = {
  success: { background: 'rgba(63,191,143,0.14)', color: colors.successBright },
  warning: { background: 'rgba(251,238,219,0.14)', color: '#F2C27B' },
  danger: { background: 'rgba(251,229,226,0.14)', color: '#F49A91' },
  neutral: { background: 'rgba(255,255,255,0.08)', color: colors.onInkMuted },
};

function Strip({ tone, children }) {
  const palette = tones[tone];
  return (
    <View style={[styles.strip, { backgroundColor: palette.background }]} accessibilityRole={tone === 'danger' ? 'alert' : undefined}>
      <Text style={[styles.stripText, { color: palette.color }]}>{children}</Text>
    </View>
  );
}

// Safed kone + upar-neeche chalti hari line.
function Viewfinder({ scanning }) {
  const line = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!scanning) return undefined;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(line, { toValue: 1, duration: 1600, useNativeDriver: true }),
        Animated.timing(line, { toValue: 0, duration: 1600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [line, scanning]);

  return (
    <View style={styles.frame} pointerEvents="none">
      <View style={[styles.corner, styles.topLeft]} />
      <View style={[styles.corner, styles.topRight]} />
      <View style={[styles.corner, styles.bottomLeft]} />
      <View style={[styles.corner, styles.bottomRight]} />
      {scanning && (
        <Animated.View style={[styles.scanLine, { transform: [{ translateY: line.interpolate({ inputRange: [0, 1], outputRange: [12, FRAME - 14] }) }] }]} />
      )}
    </View>
  );
}

// Visit ke kadam 1 (location) aur 2 (client ka QR scan karke check-in). route.params.meeting: Visits list wali meeting.
export default function VisitCheckInScreen({ navigation, route }) {
  const { meeting } = route.params;
  const insets = useSafeAreaInsets();
  const location = useLocation({ ask: true, watch: true });
  const [permission, requestPermission] = useCameraPermissions();
  // Scan se pehle andaza (default grace); scan ke baad server ki asli window.
  const [checkWindow, setCheckWindow] = useState(() => checkInWindow(meeting));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const handled = useRef(false); // ek scan ek hi baar (camera ek second mein kai baar padhta hai)

  const { position } = location;
  const place = meeting.location;
  const distance = position && place?.lat != null ? Math.round(distanceInMeters(position, place)) : null;
  const weak = Boolean(position && position.accuracy > getMaxGpsAccuracy());
  const inside = distance != null && distance <= place.radius;

  const goToSelfie = async (checkedIn) => {
    await saveVisitProgress(meeting._id, { step: 3 });
    navigation.replace('VisitComplete', { meeting: { ...meeting, ...checkedIn, status: 'CHECKED_IN' } });
  };

  const onScanned = async ({ data }) => {
    if (handled.current || busy) return;
    handled.current = true;
    const token = String(data ?? '').trim();
    setBusy(true);
    setError('');
    try {
      // Pehle dekh lo ki QR isi meeting ka hai (warna kisi aur meeting mein check-in ho jata).
      const scan = await scanMeetingApi(token);
      const scanned = scan.data.meeting;
      setCheckWindow({ opensAt: new Date(scanned.checkInOpensAt), closesAt: new Date(scanned.checkInClosesAt) });
      if (scanned._id !== meeting._id) {
        throw { message: `This QR code is for another meeting${scanned.client?.name ? ` (${scanned.client.name})` : ''}. Scan the QR for this client.` };
      }
      if (scan.data.alreadyCheckedIn) {
        await goToSelfie();
        return;
      }
      if (!position) throw { message: 'Still finding your location. Wait a moment and scan again.' };
      await checkInMeetingApi(token, position);
      await goToSelfie();
    } catch (err) {
      setError(err.message || 'Could not connect to the server. Try again.');
      setBusy(false);
    }
  };

  const scanAgain = () => {
    setError('');
    handled.current = false;
    location.refresh();
  };

  // ---------- Location ki patti (kadam 1) ----------
  let strip;
  if (location.status === 'denied' || location.status === 'off') {
    strip = <Strip tone="warning">Allow location to check in. We use it only to confirm you are at the client site.</Strip>;
  } else if (!position) {
    strip = <Strip tone="neutral">Finding your location…</Strip>;
  } else if (place?.lat == null) {
    strip = <Strip tone="neutral">GPS ±{position.accuracy} m. The meeting location will be checked when you scan.</Strip>;
  } else if (weak) {
    strip = <Strip tone="warning">Weak GPS (±{position.accuracy} m). Move to open sky before scanning.</Strip>;
  } else if (inside) {
    strip = (
      <Strip tone="success">
        Within {formatDistance(distance)} of client site (allowed {place.radius} m)
      </Strip>
    );
  } else {
    strip = (
      <Strip tone="danger">
        {formatDistance(distance)} from client site (allowed {place.radius} m). Reach the client location to check in.
      </Strip>
    );
  }

  // ---------- Camera (kadam 2) ----------
  let camera;
  if (!permission) {
    camera = <View style={styles.cameraBox} />;
  } else if (!permission.granted) {
    camera = (
      <View style={[styles.cameraBox, styles.cameraOff]}>
        <CameraOff size={28} strokeWidth={1.8} color={colors.onInkMuted} />
        <Text style={styles.offText}>Allow the camera to scan the client's QR code.</Text>
        <SecondaryButton
          title={permission.canAskAgain ? 'Allow camera' : 'Open settings'}
          onPress={permission.canAskAgain ? requestPermission : location.openSettings}
          style={styles.lightButton}
        />
      </View>
    );
  } else {
    camera = (
      <View style={styles.cameraBox}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={busy || error ? undefined : onScanned}
        />
        <Viewfinder scanning={!busy && !error} />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + spacing.gapLg }]}>
      <View style={styles.header}>
        <Pressable style={styles.back} onPress={navigation.goBack} accessibilityRole="button" accessibilityLabel="Go back">
          <ArrowLeft size={20} strokeWidth={2} color={colors.onInk} />
        </Pressable>
        <View style={styles.flex}>
          <Text style={styles.title} numberOfLines={1}>
            {meeting.client || meeting.title}
          </Text>
          <Text style={styles.subtitle}>
            Check-in window{' '}
            <Text style={styles.mono}>
              {formatTime(checkWindow.opensAt)} – {formatTime(checkWindow.closesAt)}
            </Text>
          </Text>
        </View>
      </View>

      <Stepper steps={STEPS} current={1} dark />
      {strip}

      {camera}
      <Text style={styles.hint}>{busy ? 'Checking in…' : 'Point the camera at the QR code your admin shared with the client.'}</Text>

      {error ? (
        <>
          <Strip tone="danger">{error}</Strip>
          <SecondaryButton title="Scan again" onPress={scanAgain} />
        </>
      ) : null}
    </View>
  );
}

const corner = { position: 'absolute', width: 34, height: 34, borderColor: colors.onInk };

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BACKGROUND, paddingHorizontal: spacing.screen, gap: spacing.gapLg },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.gap },
  back: {
    width: sizes.touch,
    height: sizes.touch,
    borderRadius: sizes.touch / 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontFamily: fonts.heading, fontSize: 22, color: colors.onInk },
  subtitle: { fontFamily: fonts.body, fontSize: 13, color: colors.onInkMuted },
  mono: { fontFamily: fonts.mono, color: colors.onInk },
  strip: { borderRadius: radius.input, paddingHorizontal: 14, paddingVertical: 12 },
  stripText: { fontFamily: fonts.bodyMedium, fontSize: 14, lineHeight: 20 },
  cameraBox: { flex: 1, minHeight: 280, borderRadius: radius.hero, overflow: 'hidden', backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  cameraOff: { gap: spacing.gap, padding: spacing.screen, backgroundColor: 'rgba(255,255,255,0.05)' },
  offText: { ...text.body, color: colors.onInkMuted, textAlign: 'center' },
  lightButton: { alignSelf: 'stretch' },
  frame: { width: FRAME, height: FRAME },
  corner,
  topLeft: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 12 },
  topRight: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 12 },
  bottomLeft: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 12 },
  bottomRight: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 12 },
  scanLine: { position: 'absolute', left: 14, right: 14, height: 2, borderRadius: 1, backgroundColor: colors.successBright },
  hint: { fontFamily: fonts.body, fontSize: 13, color: colors.onInkMuted, textAlign: 'center' },
});
