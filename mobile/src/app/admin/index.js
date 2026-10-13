import { useCallback } from 'react';
import { Text } from 'react-native';
import { getTodaySummaryApi, listCorrectionsApi, listLeavesApi } from '../../api/endpoints.js';
import { Card, Notice, Screen, Stat, StatRow, styles } from '../../components/ui.js';
import { useAuth } from '../../context/AuthContext.js';
import { formatDate } from '../../utils/format.js';
import { useLoad } from '../../utils/useLoad.js';

const DAY_TYPE_TEXT = { WEEK_OFF: 'Today is a weekly off.', HOLIDAY: 'Today is a holiday.' };

// Sirf pending ki ginti chahiye, isliye list ka ek hi item mangwate hain.
const pendingCount = (listApi) => listApi({ status: 'PENDING', limit: 1 }).then((response) => response.data.counts.PENDING);

export default function AdminToday() {
  const { company } = useAuth();
  const { leaveEnabled, correctionsEnabled, subscription } = company;

  const fetchToday = useCallback(async () => {
    const [summary, leaves, corrections] = await Promise.all([
      getTodaySummaryApi().then((response) => response.data),
      leaveEnabled ? pendingCount(listLeavesApi) : null,
      correctionsEnabled ? pendingCount(listCorrectionsApi) : null,
    ]);
    return { summary, leaves, corrections };
  }, [leaveEnabled, correctionsEnabled]);
  const { data, error, loading, refreshing, refresh } = useLoad(fetchToday);
  const summary = data?.summary;

  return (
    <Screen
      title={company.name}
      subtitle={summary ? formatDate(summary.date) : undefined}
      loading={loading}
      refreshing={refreshing}
      onRefresh={refresh}
      error={error}
    >
      {summary ? (
        <>
          {subscription?.daysLeft > 0 && subscription.daysLeft <= 15 ? (
            <Notice
              tone="warning"
              text={`Your ${subscription.status === 'TRIAL' ? 'free trial' : 'subscription'} ends in ${subscription.daysLeft} day${subscription.daysLeft === 1 ? '' : 's'}. Open Plan & Billing on the PayRoster website to continue without a break.`}
            />
          ) : null}
          {DAY_TYPE_TEXT[summary.dayType] ?<Notice tone="info" text={DAY_TYPE_TEXT[summary.dayType]} /> : null}
          {summary.locationsCount ? null : (
            <Notice tone="warning" text="No office location is set, so staff cannot punch. Add one in Settings on the website." />
          )}

          <Text style={styles.label}>Attendance today</Text>
          <StatRow>
            <Stat label="Total staff" value={summary.totalStaff} />
            <Stat label="Present" value={summary.present} tone="success" />
            <Stat label="On leave" value={summary.onLeave} tone="info" />
            <Stat label="Not marked" value={summary.notMarked} tone="warning" />
            <Stat label="Punched out" value={summary.punchedOut} />
          </StatRow>

          {data.leaves !== null || data.corrections !== null ? (
            <>
              <Text style={styles.label}>Waiting for your approval</Text>
              <StatRow>
                {data.leaves !== null ? <Stat label="Leave requests" value={data.leaves} tone="warning" /> : null}
                {data.corrections !== null ? <Stat label="Punch corrections" value={data.corrections} tone="warning" /> : null}
              </StatRow>
            </>
          ) : null}

          <Card>
            <Text style={styles.muted}>Staff, payroll and settings are managed on the PayRoster website.</Text>
          </Card>
        </>
      ) : null}
    </Screen>
  );
}
