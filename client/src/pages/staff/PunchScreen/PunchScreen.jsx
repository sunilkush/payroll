import { useEffect, useMemo, useState } from 'react';
import { ReloadOutlined } from '@ant-design/icons';
import { Button, Card, Statistic } from 'antd';
import { getTodayApi, punchInApi, punchOutApi } from '../../../api/attendanceApi.js';
import Alert from '../../../components/Alert/Alert.jsx';
import Badge from '../../../components/Badge/Badge.jsx';
import Loader from '../../../components/Loader/Loader.jsx';
import PunchMap from '../../../components/PunchMap/PunchMap.jsx';
import { formatDate, formatTime, WEEKDAYS } from '../../../utils/format.js';
import { nearestOffice } from '../../../utils/geo.js';
import { getCurrentPosition, watchPosition } from '../../../utils/geolocation.js';
import './PunchScreen.css';

// Map wali location itni purani ho to punch ke liye nayi li jati hai
const MAX_POSITION_AGE_MS = 15000;

// Chalti ghadi (har second). Alag component hai taaki har second poori screen dobara na bane.
function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <p className="punch-screen__clock" aria-live="off">
      {formatTime(now)}
    </p>
  );
}

// Staff zyadatar phone se punch karta hai, isliye ye screen phone ke liye bani hai:
// ek haath se chalne wala bada button, bade akshar, kam se kam cheezein.
export default function PunchScreen() {
  const [today, setToday] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [message, setMessage] = useState({ type: 'success', text: '' });
  // step: null | 'locating' | 'saving'
  const [step, setStep] = useState(null);
  // Map ke liye staff ki chalu location (button dabane par punch ke liye alag se taaza location li jati hai)
  const [position, setPosition] = useState(null);
  const [positionError, setPositionError] = useState('');
  const [refreshCount, setRefreshCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    getTodayApi()
      .then((res) => setToday(res.data))
      .catch((err) => setLoadError(err.message));
  }, []);

  // Location track karna. refreshCount badhne par (Refresh button) purana tracking band hokar naya
  // shuru hota hai, jisse browser bilkul taaza location deta hai.
  useEffect(
    () =>
      watchPosition(
        (current) => {
          setPosition({ ...current, at: Date.now() });
          setPositionError('');
          setRefreshing(false);
        },
        (text) => {
          setPositionError(text);
          setRefreshing(false);
        },
        { fresh: refreshCount > 0 }
      ),
    [refreshCount]
  );

  const handleRefreshLocation = () => {
    setRefreshing(true);
    setPositionError('');
    setRefreshCount((count) => count + 1);
    getTodayApi()
      .then((res) => setToday(res.data))
      .catch(() => {});
  };

  // Map sirf un offices ka jinke coordinates mile hain (backend purana chal raha ho to nahi milte)
  const mappable = useMemo(
    () => (today?.locations ?? []).filter((location) => Number.isFinite(location.lat) && Number.isFinite(location.lng)),
    [today?.locations]
  );

  if (loadError) return <Alert>{loadError}</Alert>;
  if (!today) return <Loader />;

  const { attendance, locations, isSunday, isWeekOff, weekOffDayName, holidayName, workTime } = today;
  const punchedIn = Boolean(attendance);
  const punchedOut = Boolean(attendance?.punchOut);
  const noLocation = locations.length === 0;

  const displayWeekOffName = weekOffDayName || (isSunday ? 'Sunday' : 'Weekly Off');
  const isOffDay = !punchedIn && (isSunday || isWeekOff || Boolean(holidayName));

  const checkWorkHours = () => {
    if (!workTime?.enabled || !workTime?.start || !workTime?.end) {
      return { isOutside: false, message: '' };
    }
    const now = new Date();
    const currentMin = now.getHours() * 60 + now.getMinutes();
    const [sH, sM] = workTime.start.split(':').map(Number);
    const [eH, eM] = workTime.end.split(':').map(Number);
    const startMin = sH * 60 + sM;
    const endMin = eH * 60 + eM;

    if (currentMin < startMin) {
      return {
        isOutside: true,
        message: `Office starts at ${workTime.start}. Punch-in is only allowed during working hours (${workTime.start} - ${workTime.end}).`,
      };
    }
    if (currentMin > endMin) {
      return {
        isOutside: true,
        message: `Office working hours are over (${workTime.start} - ${workTime.end}). Punch-in is closed for today.`,
      };
    }
    return { isOutside: false, message: '' };
  };

  const workHoursStatus = checkWorkHours();
  const outsideHours = !punchedIn && workHoursStatus.isOutside;
  const isPunchBlocked = !punchedIn && (isOffDay || outsideHours);

  const offDayReason = holidayName
    ? `Today is a Paid Holiday (${holidayName}). Punch-in is not allowed.`
    : isOffDay
    ? `Today is ${displayWeekOffName} (Weekly Off). Punch-in is not allowed.`
    : '';

  // Sirf dikhane ke liye; punch ho sakta hai ya nahi, ye server tay karta hai
  const nearest = position && mappable.length ? nearestOffice(mappable, position) : null;

  const handlePunch = async () => {
    if (isPunchBlocked) {
      setMessage({ type: 'error', text: offDayReason || workHoursStatus.message || 'Punch-in is not allowed at this time.' });
      return;
    }

    setMessage({ type: 'success', text: '' });
    try {
      setStep('locating');
      // Map pehle se location track kar raha hai. Wo taaza ho to wahi use karo (turant punch);
      // purani ho ya mili hi na ho to browser se nayi maango.
      const fresh = position && Date.now() - position.at < MAX_POSITION_AGE_MS;
      const current = fresh ? position : await getCurrentPosition();
      setStep('saving');
      const point = { lat: current.lat, lng: current.lng, accuracy: current.accuracy };
      const res = await (punchedIn ? punchOutApi(point) : punchInApi(point));
      setToday((prev) => ({ ...prev, attendance: res.data.attendance }));
      setMessage({ type: 'success', text: punchedIn ? 'Punched out.' : 'Punched in.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setStep(null);
    }
  };

  let buttonLabel = punchedIn ? 'Punch Out' : 'Punch In';
  if (step === 'locating') buttonLabel = 'Getting location...';
  if (step === 'saving') buttonLabel = 'Saving...';

  let status = 'Not punched in today';
  if (isOffDay) status = holidayName ? `Holiday: ${holidayName}` : `${displayWeekOffName} (Weekly Off)`;
  else if (outsideHours) status = `Outside Hours (${workTime.start} - ${workTime.end})`;
  else if (punchedIn) status = `Punch in: ${attendance.punchIn.locationName ?? 'Office'}`;
  else if (punchedOut) status = 'Attendance complete for today';

  return (
    <section className="punch-screen">
      {/* Page ka naam top bar mein hai; ye heading sirf screen reader ke liye */}
      <h1 className="visually-hidden">Punch In / Out</h1>

      <Card className="punch-screen__card">
        <p className="punch-screen__date">
          {WEEKDAYS[new Date(`${today.date}T00:00:00`).getDay()]}, {formatDate(today.date)}
        </p>
        <Clock />
        <p className={`punch-screen__status${punchedIn ? ' punch-screen__status--in' : ''}`}>{status}</p>

        {isOffDay && (
          <div style={{ marginBottom: 12 }}>
            <Alert tone="warning">
              {offDayReason}
            </Alert>
          </div>
        )}

        {outsideHours && !isOffDay && (
          <div style={{ marginBottom: 12 }}>
            <Alert tone="warning">
              {workHoursStatus.message}
            </Alert>
          </div>
        )}

        <Alert type={message.type}>{message.text}</Alert>

        

        {noLocation ? (
          <p className="punch-screen__hint">No office location is set. Please contact your admin.</p>
        ) : !mappable.length ? (
          <p className="punch-screen__hint">
            You can punch only within the office range:{' '}
            {locations.map((location) => `${location.name} (${location.radius}m)`).join(', ')}
          </p>
        ) : (
          <div className="punch-screen__map">
            <p className="punch-screen__range">
              {nearest ? (
                <>
                  <Badge tone={nearest.inside ? 'success' : 'danger'}>
                    {nearest.inside ? 'Inside range' : 'Outside range'}
                  </Badge>
                  <span>
                    {nearest.distance}m from {nearest.location.name} (range {nearest.location.radius}m)
                  </span>
                </>
              ) : (
                <span>{positionError || 'Finding your location...'}</span>
              )}
            </p>
            <div className="punch-screen__refresh">
              {/* GPS kitni sahi hai; staff ko samajh aaye ki bahar kyun dikha raha hai */}
              {position && !positionError && <span>GPS accuracy ±{Math.round(position.accuracy)}m</span>}
              <Button
                size="small"
                className="punch-screen__refresh-button"
                icon={<ReloadOutlined />}
                loading={refreshing}
                onClick={handleRefreshLocation}
              >
                {positionError ? 'Try again' : 'Refresh location'}
              </Button>
            </div>
            <PunchMap locations={mappable} position={position} recenterKey={refreshCount} />
          </div>
        )}
         {!punchedOut && (
          <Button
            block
            type={isPunchBlocked ? 'default' : 'primary'}
            danger={punchedIn}
            className={`punch-screen__button punch-screen__button--${punchedIn ? 'out' : 'in'}`}
            loading={Boolean(step)}
            disabled={noLocation || isPunchBlocked}
            onClick={handlePunch}
          >
            {isPunchBlocked
              ? holidayName
                ? 'Punch Disabled (Holiday)'
                : isOffDay
                ? `Punch Disabled (${displayWeekOffName})`
                : 'Punch Disabled (Outside Working Hours)'
              : buttonLabel}
          </Button>
        )}
        <div className="punch-screen__times">
          <Card size="small" variant="borderless" className="punch-screen__time">
            <Statistic title="Punch In" value={formatTime(attendance?.punchIn?.time)} />
          </Card>
          <Card size="small" variant="borderless" className="punch-screen__time">
            <Statistic title="Punch Out" value={formatTime(attendance?.punchOut?.time)} />
          </Card>
        </div>
      </Card>
    </section>
  );
}
