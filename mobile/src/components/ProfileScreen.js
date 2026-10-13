import { useEffect, useState } from 'react';
import { Alert, Switch, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext.js';
import { colors } from '../theme.js';
import { APP_VERSION } from '../utils/appVersion.js';
import { biometricAvailable, isLockEnabled, setLockEnabled, unlock } from '../utils/biometric.js';
import { Button, Card, Screen, styles } from './ui.js';

const ROLE_LABEL = { SUPER_ADMIN: 'Super Admin', ADMIN: 'Company Admin', STAFF: 'Staff' };

// App lock ka switch. Phone mein fingerprint / face set na ho to dikhta hi nahi.
function AppLock() {
  const [available, setAvailable] = useState(false);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    (async () => {
      setAvailable(await biometricAvailable());
      setEnabled(await isLockEnabled());
    })();
  }, []);

  async function toggle(next) {
    // ON karne se pehle ek baar check: jo ON kar raha hai wahi phone ka maalik ho.
    if (next && !(await unlock())) {
      Alert.alert('App lock was not turned on', 'We could not confirm your fingerprint or face.');
      return;
    }
    await setLockEnabled(next);
    setEnabled(next);
  }

  if (!available) return null;
  return (
    <Card>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.heading}>App lock</Text>
          <Text style={styles.muted}>Ask for fingerprint or face when the app opens.</Text>
        </View>
        <Switch value={enabled} onValueChange={toggle} trackColor={{ true: colors.primary }} />
      </View>
    </Card>
  );
}

// Teeno roles ka "Profile" tab yahi hai.
export default function ProfileScreen() {
  const { user, company, logout } = useAuth();
  return (
    <Screen title="Profile">
      <Card>
        <Text style={styles.heading}>{user.name}</Text>
        <Text style={styles.text}>{user.email}</Text>
        <Text style={styles.muted}>{ROLE_LABEL[user.role]}</Text>
        {user.employeeCode ? <Text style={styles.muted}>Employee code: {user.employeeCode}</Text> : null}
        {user.designation ? <Text style={styles.muted}>{user.designation}</Text> : null}
      </Card>
      {company ? (
        <Card>
          <Text style={styles.label}>Company</Text>
          <Text style={styles.heading}>{company.name}</Text>
        </Card>
      ) : null}
      <AppLock />
      <Button label="Log out" variant="outline" onPress={logout} />
      <Text style={[styles.muted, { textAlign: 'center' }]}>Version {APP_VERSION}</Text>
    </Screen>
  );
}
