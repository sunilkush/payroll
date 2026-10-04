import { useEffect, useState } from 'react';
import { Button, Card, Statistic } from 'antd';
import { getTodayApi, punchInApi, punchOutApi } from '../../../api/attendanceApi.js';
import Alert from '../../../components/Alert/Alert.jsx';
import Loader from '../../../components/Loader/Loader.jsx';
import { formatDate, formatTime, WEEKDAYS } from '../../../utils/format.js';
import { getCurrentPosition } from '../../../utils/geolocation.js';
import './PunchScreen.css';

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

  useEffect(() => {
    getTodayApi()
      .then((res) => setToday(res.data))
      .catch((err) => setLoadError(err.message));
  }, []);

  if (loadError) return <Alert>{loadError}</Alert>;
  if (!today) return <Loader />;

  const { attendance, locations } = today;
  const punchedIn = Boolean(attendance);
  const punchedOut = Boolean(attendance?.punchOut);
  const noLocation = locations.length === 0;

  const handlePunch = async () => {
    setMessage({ type: 'success', text: '' });
    try {
      setStep('locating');
      const position = await getCurrentPosition();
      setStep('saving');
      const res = await (punchedIn ? punchOutApi(position) : punchInApi(position));
      setToday((prev) => ({ ...prev, attendance: res.data.attendance }));
      setMessage({ type: 'success', text: punchedIn ? 'Punch out ho gaya.' : 'Punch in ho gaya.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setStep(null);
    }
  };

  let buttonLabel = punchedIn ? 'Punch Out' : 'Punch In';
  if (step === 'locating') buttonLabel = 'Location le rahe hain...';
  if (step === 'saving') buttonLabel = 'Saving...';

  let status = 'Aaj punch in nahi hua';
  if (punchedIn) status = `Punch in: ${attendance.punchIn.locationName ?? 'Office'}`;
  if (punchedOut) status = 'Aaj ki attendance poori ho gayi';

  return (
    <section className="punch-screen">
      <h1 className="punch-screen__title">Punch In / Out</h1>

      <Card className="punch-screen__card">
        <p className="punch-screen__date">
          {WEEKDAYS[new Date(`${today.date}T00:00:00`).getDay()]}, {formatDate(today.date)}
        </p>
        <Clock />
        <p className={`punch-screen__status${punchedIn ? ' punch-screen__status--in' : ''}`}>{status}</p>

        <Alert type={message.type}>{message.text}</Alert>

        {!punchedOut && (
          <Button
            block
            type="primary"
            danger={punchedIn}
            className={`punch-screen__button punch-screen__button--${punchedIn ? 'out' : 'in'}`}
            loading={Boolean(step)}
            disabled={noLocation}
            onClick={handlePunch}
          >
            {buttonLabel}
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

        {noLocation ? (
          <p className="punch-screen__hint">Office location set nahi hai. Admin se contact karein.</p>
        ) : (
          <p className="punch-screen__hint">
            Punch sirf office range ke andar hota hai:{' '}
            {locations.map((location) => `${location.name} (${location.radius}m)`).join(', ')}
          </p>
        )}
      </Card>
    </section>
  );
}
