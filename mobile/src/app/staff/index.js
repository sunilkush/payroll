import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { getTodayApi, punchInApi, punchOutApi } from '../../api/endpoints.js';
import { Button, Card, Notice, Screen, Stat, StatRow, StatusBadge, styles } from '../../components/ui.js';
import { useAuth } from '../../context/AuthContext.js';
import { space } from '../../theme.js';
import { formatDate, formatMinutes, formatTime } from '../../utils/format.js';
import { getPunchPosition } from '../../utils/location.js';
import { enqueuePunch, getQueue, syncQueue } from '../../utils/offlinePunch.js';
import { useLoad } from '../../utils/useLoad.js';

const API = { in: punchInApi, out: punchOutApi };
const DONE_TEXT = { in: 'Punched in.', out: 'Punched out.' };

// Aaj punch kyun nahi ho sakta (server bhi yahi rokta hai; yahan sirf pehle se bata dete hain).
function blockedReason(today) {
  if (today.holidayName) return `Today is a holiday (${today.holidayName}).`;
  if (today.isWeekOff) return `Today is ${today.weekOffDayName} (weekly off).`;
  if (!today.locations.length) return 'No office location is set. Please contact your admin.';
  return null;
}

export default function Punch() {
  const { user } = useAuth();
  const [queue, setQueue] = useState([]); // network na hone par jama punch
  const [punching, setPunching] = useState(null); // 'in' | 'out'
  const [message, setMessage] = useState(null); // { tone, text }

  // Screen khulte / refresh par: pehle jama punch bhejo, phir aaj ka haal.
  const fetchToday = useCallback(async () => {
    setQueue(await getQueue());
    const sync = await syncQueue();
    setQueue(sync.queue);
    if (sync.rejected.length) {
      setMessage({ tone: 'danger', text: `An offline punch was not accepted: ${sync.rejected.join(' ')}` });
    }
    return getTodayApi().then((response) => response.data);
  }, []);
  const { data: today, error, offline, loading, refreshing, refresh, reload } = useLoad(fetchToday);

  const metrics = today?.metrics;
  // Jama punch abhi server par nahi hain, isliye "andar hoon ya bahar" unhe mila kar dekhte hain.
  const lastQueued = queue.at(-1)?.type;
  const isIn = lastQueued ? lastQueued === 'in' : Boolean(metrics?.isCurrentlyWorking);
  const blocked = today ? blockedReason(today) : null;
  // Kaam ke time ke bahar sirf punch in rukta hai; punch out hamesha ho sakta hai.
  const disabled = !isIn && Boolean(blocked || today?.isOutsideWorkHours);

  async function punch(type) {
    setPunching(type);
    setMessage(null);
    try {
      const position = await getPunchPosition();
      try {
        await API[type](position);
        setMessage({ tone: 'success', text: DONE_TEXT[type] });
        await reload();
      } catch (err) {
        if (err.status) throw err; // server ne mana kiya (range ke bahar waghera)
        // Network nahi: punch phone mein jama, network aate hi chala jayega.
        setQueue(await enqueuePunch(type, position));
        setMessage({ tone: 'warning', text: `No network. Your punch ${type} is saved on this phone and will be sent when you are back online.` });
      }
    } catch (err) {
      setMessage({ tone: 'danger', text: err.message });
    } finally {
      setPunching(null);
    }
  }

  const punchButton = (type, style) => (
    <Button
      label={type === 'in' ? 'Punch in' : 'Punch out'}
      variant={type === 'in' ? 'primary' : 'danger'}
      onPress={() => punch(type)}
      loading={punching === type}
      disabled={Boolean(punching) || (type === 'in' && disabled)}
      style={style}
    />
  );

  return (
    <Screen
      title={`Hi, ${user.name.split(' ')[0]}`}
      subtitle={today ? formatDate(today.date) : undefined}
      loading={loading}
      refreshing={refreshing}
      onRefresh={refresh}
      error={offline ? '' : error}
    >
      {message ? <Notice tone={message.tone} text={message.text} /> : null}
      {offline ? <Notice tone="warning" text="You are offline. You can still punch; it is sent when you are back online (same day only)." /> : null}
      {queue.length ? (
        <Card>
          <Text style={styles.label}>Waiting to be sent ({queue.length})</Text>
          {queue.map((item) => (
            <Text key={item.clientTime} style={styles.text}>
              Punch {item.type} · {formatTime(item.clientTime)}
            </Text>
          ))}
          <Text style={styles.muted}>Pull down to try sending now.</Text>
        </Card>
      ) : null}

      {today ? (
        <>
          {!isIn && blocked ? <Notice tone="info" text={blocked} /> : null}
          {!isIn && !blocked && today.workHoursMessage ? <Notice tone="warning" text={today.workHoursMessage} /> : null}

          <Card>
            <View style={styles.row}>
              <Text style={styles.heading}>{isIn ? 'You are punched in' : 'You are punched out'}</Text>
              <StatusBadge status={metrics?.status ?? 'NOT_MARKED'} />
            </View>
            {punchButton(isIn ? 'out' : 'in')}
            <Text style={styles.muted}>
              Your location is checked only at the moment you punch. You must be inside the office range.
            </Text>
          </Card>

          <StatRow>
            <Stat label="First in" value={formatTime(metrics?.firstIn)} />
            <Stat label="Last out" value={formatTime(metrics?.lastOut)} />
            <Stat label="Worked" value={formatMinutes(metrics?.totalNetWorkMinutes ?? 0)} />
          </StatRow>

          {today.workTime ? (
            <Card>
              <Text style={styles.label}>Working hours</Text>
              <Text style={styles.text}>
                {today.workTime.start} - {today.workTime.end}
              </Text>
              {metrics?.remainingWorkMinutes > 0 ? (
                <Text style={styles.muted}>Remaining today: {formatMinutes(metrics.remainingWorkMinutes)}</Text>
              ) : null}
            </Card>
          ) : null}

          <Card>
            <Text style={styles.label}>Office locations</Text>
            {today.locations.map((location) => (
              <View key={`${location.lat},${location.lng}`} style={styles.row}>
                <Text style={styles.text}>{location.name}</Text>
                <Text style={styles.muted}>within {location.radius} m</Text>
              </View>
            ))}
          </Card>
        </>
      ) : offline ? (
        // App offline hi khula: aaj ka haal pata nahi, isliye dono button. Server galat wale ko baad mein mana kar dega.
        <Card>
          <Text style={styles.heading}>{lastQueued ? (isIn ? 'You are punched in' : 'You are punched out') : 'Punch'}</Text>
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            {lastQueued !== 'in' ? punchButton('in', { flex: 1 }) : null}
            {lastQueued !== 'out' ? punchButton('out', { flex: 1 }) : null}
          </View>
        </Card>
      ) : null}
    </Screen>
  );
}
