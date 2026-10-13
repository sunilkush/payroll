import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext.js';
import { colors, space } from '../theme.js';
import { checkForcedUpdate } from '../utils/appVersion.js';
import { isLockEnabled, unlock } from '../utils/biometric.js';
import { Button, styles } from './ui.js';

// App itni der background mein rahe to wapas aane par lock lagta hai.
const LOCK_AFTER_MS = 60 * 1000;

// Poori screen dhakne wala parda (update zaroori / app locked). Neeche ka app waisa hi bana rehta hai.
function Cover({ title, text, children }) {
  return (
    <View style={[StyleSheet.absoluteFill, cover.box]}>
      <Text style={cover.brand}>PayRoster</Text>
      <Text style={styles.heading}>{title}</Text>
      <Text style={[styles.muted, cover.text]}>{text}</Text>
      {children}
    </View>
  );
}

// App ke upar do darwaze:
//   1. Force update: server ke minVersion se purana app aage nahi badhta.
//   2. App lock: user ne Profile mein ON kiya ho to khulte waqt fingerprint / face.
export default function AppGate({ children }) {
  const { user, loading, logout } = useAuth();
  const [update, setUpdate] = useState(null); // { storeUrl } jab update zaroori ho
  // Kis user ke liye lock laga hai (id). Logout / doosra user aate hi apne aap bekaar ho jata hai.
  const [lockedFor, setLockedFor] = useState(null);
  const [checked, setChecked] = useState(false); // shuru ka lock check ho gaya (tab tak andar ka kuch nahi dikhta)
  const leftAt = useRef(null);
  const userId = user?._id ?? null;
  const hasUser = Boolean(user);
  const locked = Boolean(lockedFor) && lockedFor === userId;

  useEffect(() => {
    checkForcedUpdate().then(setUpdate);
  }, []);

  const tryUnlock = useCallback(async () => {
    if (await unlock()) setLockedFor(null);
  }, []);

  // App khulte hi (saved login mil gaya ho): lock ON hai to pehle unlock.
  // Sirf ek baar chalta hai, isliye abhi-abhi login karne wale se dobara nahi maanga jata.
  useEffect(() => {
    if (loading || checked) return;
    (async () => {
      if (hasUser && (await isLockEnabled())) {
        setLockedFor(userId);
        tryUnlock();
      }
      setChecked(true);
    })();
  }, [loading, checked, hasUser, userId, tryUnlock]);

  // Background se der baad wapas aane par phir lock.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (state) => {
      if (state === 'background') {
        leftAt.current = Date.now();
      } else if (state === 'active' && leftAt.current) {
        const away = Date.now() - leftAt.current;
        leftAt.current = null;
        if (hasUser && away > LOCK_AFTER_MS && (await isLockEnabled())) {
          setLockedFor(userId);
          tryUnlock();
        }
      }
    });
    return () => subscription.remove();
  }, [hasUser, userId, tryUnlock]);


  return (
    <View style={{ flex: 1 }}>
      {checked || loading ? children : null}
      {locked && !update ? (
        <Cover title="App is locked" text="Unlock with your fingerprint, face or phone PIN.">
          <Button label="Unlock" onPress={tryUnlock} style={cover.button} />
          <Button label="Log out" variant="outline" onPress={logout} style={cover.button} />
        </Cover>
      ) : null}
      {update ? (
        <Cover title="Update required" text="This version of PayRoster is no longer supported. Please update the app to continue.">
          {update.storeUrl ? <Button label="Update" onPress={() => Linking.openURL(update.storeUrl)} style={cover.button} /> : null}
        </Cover>
      ) : null}
    </View>
  );
}

const cover = StyleSheet.create({
  box: { backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: space.xl, gap: space.md },
  brand: { fontSize: 28, fontWeight: '700', color: colors.primary, marginBottom: space.lg },
  text: { textAlign: 'center' },
  button: { alignSelf: 'stretch' },
});
