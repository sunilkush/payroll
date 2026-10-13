import { useState } from 'react';
import { Text } from 'react-native';
import RoleTabs from '../../components/RoleTabs.js';
import { Button, Card, Notice, Screen, styles } from '../../components/ui.js';
import { useAuth } from '../../context/AuthContext.js';

const TABS = [
  { name: 'index', title: 'Today', icon: 'speedometer-outline' },
  { name: 'leaves', title: 'Leaves', icon: 'calendar-outline', feature: 'leaveEnabled' },
  { name: 'corrections', title: 'Corrections', icon: 'create-outline', feature: 'correctionsEnabled' },
  { name: 'profile', title: 'Profile', icon: 'person-outline' },
];

// Free trial / subscription khatam: admin ke liye app mein bas yahi screen. Plan website se liya jata hai
// (app mein na daam hai na payment); plan chalu hote hi "Check again" se app khul jata hai.
function SubscriptionRequired() {
  const { company, reload, logout } = useAuth();
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');

  async function check() {
    setChecking(true);
    setError('');
    try {
      await reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setChecking(false);
    }
  }

  return (
    <Screen title="Subscription required" error={error}>
      <Notice tone="danger" text={`The free trial or subscription for ${company.name} has ended.`} />
      <Card>
        <Text style={styles.text}>
          Your staff cannot log in and the app is locked until a plan is active. Your data is safe.
        </Text>
        <Text style={styles.text}>Log in to PayRoster on the web and open Plan & Billing to continue.</Text>
      </Card>
      <Button label="Check again" onPress={check} loading={checking} />
      <Button label="Log out" variant="outline" onPress={logout} />
    </Screen>
  );
}

export default function AdminLayout() {
  const { company } = useAuth();
  if (company?.subscription?.status === 'EXPIRED') return <SubscriptionRequired />;
  return <RoleTabs role="ADMIN" tabs={TABS} />;
}
