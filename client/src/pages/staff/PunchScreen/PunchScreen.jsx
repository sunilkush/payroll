import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CoffeeOutlined,
  FieldTimeOutlined,
  HistoryOutlined,
  LoginOutlined,
  LogoutOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { Button, Card, Col, Row, Statistic, Tag } from 'antd';
import { getTodayApi, punchInApi, punchOutApi } from '../../../api/attendanceApi.js';
import Alert from '../../../components/Alert/Alert.jsx';
import Badge from '../../../components/Badge/Badge.jsx';
import Loader from '../../../components/Loader/Loader.jsx';
import PunchMap from '../../../components/PunchMap/PunchMap.jsx';
import { formatDate, formatTime, WEEKDAYS } from '../../../utils/format.js';
import { nearestOffice } from '../../../utils/geo.js';
import { getCurrentPosition, watchPosition } from '../../../utils/geolocation.js';
import './PunchScreen.css';

// Map location age threshold
const MAX_POSITION_AGE_MS = 15000;

// Current Wall Clock
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

// Live Working Hours Counter
function LiveWorkingTimer({ isWorking, baseMinutes = 0, lastInTime, requiredMinutes = 510 }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!isWorking) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [isWorking]);

  const openSeconds = isWorking && lastInTime
    ? Math.max(0, Math.floor((now - new Date(lastInTime).getTime()) / 1000))
    : 0;

  const totalWorkedSeconds = baseMinutes * 60 + openSeconds;
  const requiredSeconds = requiredMinutes * 60;
  const remainingSeconds = Math.max(0, requiredSeconds - totalWorkedSeconds);

  const pad = (n) => String(Math.floor(n)).padStart(2, '0');
  const formatSecs = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${pad(h)}:${pad(m)}:${pad(sec)}`;
  };

  const reqH = pad(Math.floor(requiredMinutes / 60));
  const reqM = pad(requiredMinutes % 60);

  return (
    <div className="punch-screen__timer-card">
      <div className="punch-screen__timer-header">
        <div className="punch-screen__timer-badge">
          <span className={`punch-screen__pulse-dot ${isWorking ? 'punch-screen__pulse-dot--active' : ''}`} />
          <span>{isWorking ? 'LIVE NET WORKING TIME' : 'ACCUMULATED NET TIME'}</span>
        </div>
        <Tag color={isWorking ? 'processing' : 'default'}>
          {isWorking ? 'CURRENTLY WORKING' : 'ON BREAK / OUT'}
        </Tag>
      </div>

      <div className="punch-screen__timer-display">{formatSecs(totalWorkedSeconds)}</div>

      <div className="punch-screen__timer-meta">
        <div className="punch-screen__timer-meta-item">
          <span className="punch-screen__timer-meta-label">Required Goal</span>
          <span className="punch-screen__timer-meta-val">{reqH}:{reqM}:00</span>
        </div>
        <div className="punch-screen__timer-meta-divider" />
        <div className="punch-screen__timer-meta-item">
          <span className="punch-screen__timer-meta-label">Remaining Time</span>
          <span className={`punch-screen__timer-meta-val ${remainingSeconds === 0 ? 'punch-screen__goal-met' : ''}`}>
            {remainingSeconds === 0 ? 'Goal Completed!' : formatSecs(remainingSeconds)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function PunchScreen() {
  const [today, setToday] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [message, setMessage] = useState({ type: 'success', text: '' });
  const [step, setStep] = useState(null); // null | 'locating' | 'saving'
  const [position, setPosition] = useState(null);
  const [positionError, setPositionError] = useState('');
  const [refreshCount, setRefreshCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const loadTodayData = () => {
    return getTodayApi()
      .then((res) => {
        setToday(res.data);
        return res.data;
      })
      .catch((err) => {
        setLoadError(err.message);
      });
  };

  useEffect(() => {
    loadTodayData();
  }, []);

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
    loadTodayData().finally(() => setRefreshing(false));
  };

  const mappable = useMemo(
    () => (today?.locations ?? []).filter((location) => Number.isFinite(location.lat) && Number.isFinite(location.lng)),
    [today?.locations]
  );

  if (loadError) return <Alert>{loadError}</Alert>;
  if (!today) return <Loader />;

  const {
    attendance,
    locations,
    isSunday,
    isWeekOff,
    weekOffDayName,
    holidayName,
    workTime,
    workingHoursConfig,
    metrics,
  } = today;

  // Multi-punch parsing
  const punches = attendance?.punches?.length
    ? attendance.punches
    : attendance?.punchIn
    ? [
        { ...attendance.punchIn, type: 'IN' },
        ...(attendance.punchOut ? [{ ...attendance.punchOut, type: 'OUT' }] : []),
      ]
    : [];

  const lastPunch = punches.length > 0 ? punches[punches.length - 1] : null;
  const isCurrentlyWorking = metrics?.isCurrentlyWorking ?? (lastPunch?.type === 'IN');
  const hasStartedDay = punches.length > 0;
  const lastInPunch = [...punches].reverse().find((p) => p.type === 'IN');

  const noLocation = locations.length === 0;
  const displayWeekOffName = weekOffDayName || (isSunday ? 'Sunday' : 'Weekly Off');
  const isOffDay = !hasStartedDay && (isSunday || isWeekOff || Boolean(holidayName));

  const checkWorkHours = () => {
    const config = workingHoursConfig || workTime;
    if (!config?.workTimeEnabled && !config?.enabled) {
      return { isOutside: false, message: '' };
    }
    const startStr = config?.workStartTime || config?.start;
    const endStr = config?.workEndTime || config?.end;
    if (!startStr || !endStr) return { isOutside: false, message: '' };

    const now = new Date();
    const currentMin = now.getHours() * 60 + now.getMinutes();
    const [sH, sM] = startStr.split(':').map(Number);
    const [eH, eM] = endStr.split(':').map(Number);
    const startMin = sH * 60 + sM;
    const endMin = eH * 60 + eM;

    if (currentMin < startMin) {
      return {
        isOutside: true,
        message: `Office starts at ${startStr}. Punch-in is allowed during (${startStr} - ${endStr}).`,
      };
    }
    if (currentMin > endMin) {
      return {
        isOutside: true,
        message: `Office working hours are over (${startStr} - ${endStr}).`,
      };
    }
    return { isOutside: false, message: '' };
  };

  const workHoursStatus = checkWorkHours();
  const outsideHours = !hasStartedDay && workHoursStatus.isOutside;
  const isPunchBlocked = !hasStartedDay && (isOffDay || outsideHours);

  const offDayReason = holidayName
    ? `Today is a Paid Holiday (${holidayName}). Punch-in is not allowed.`
    : isOffDay
    ? `Today is ${displayWeekOffName} (Weekly Off). Punch-in is not allowed.`
    : '';

  const nearest = position && mappable.length ? nearestOffice(mappable, position) : null;

  const handlePunch = async () => {
    if (isPunchBlocked) {
      setMessage({ type: 'error', text: offDayReason || workHoursStatus.message || 'Punch-in is not allowed at this time.' });
      return;
    }

    setMessage({ type: 'success', text: '' });
    try {
      setStep('locating');
      const fresh = position && Date.now() - position.at < MAX_POSITION_AGE_MS;
      const current = fresh ? position : await getCurrentPosition();
      setStep('saving');
      const point = { lat: current.lat, lng: current.lng, accuracy: current.accuracy };

      const res = await (isCurrentlyWorking ? punchOutApi(point) : punchInApi(point));
      setToday((prev) => ({ ...prev, attendance: res.data.attendance }));
      setMessage({
        type: 'success',
        text: isCurrentlyWorking
          ? 'Punched out successfully. Break / Session recorded.'
          : 'Punched in successfully. Live net work tracking started.',
      });
      // Recalculate metrics
      await loadTodayData();
    } catch (err) {
      setMessage({ type: 'error', text: err.errors?.[0]?.message || err.message });
    } finally {
      setStep(null);
    }
  };

  let buttonLabel = isCurrentlyWorking
    ? 'Punch Out (Break / Leave)'
    : hasStartedDay
    ? 'Punch In (Resume Work)'
    : 'Punch In';

  if (step === 'locating') buttonLabel = 'Acquiring GPS location...';
  if (step === 'saving') buttonLabel = 'Verifying & Saving...';

  // Status computation
  let statusText = 'Not Punched In Today';
  let statusTone = 'default';

  const effectiveStatus = attendance?.status || metrics?.status;

  if (isOffDay) {
    statusText = holidayName ? `Holiday: ${holidayName}` : `${displayWeekOffName} (Weekly Off)`;
    statusTone = 'warning';
  } else if (effectiveStatus === 'LEAVE') {
    statusText = 'On Leave';
    statusTone = 'info';
  } else if (effectiveStatus === 'ABSENT') {
    statusText = metrics?.subStatus === 'EARLY_DEPARTURE_ABSENT' ? 'Absent (Early Departure before 4:30 PM)' : 'Absent';
    statusTone = 'danger';
  } else if (effectiveStatus === 'PRESENT' || metrics?.subStatus === 'COMPLETED') {
    statusText = 'Present (Goal Completed)';
    statusTone = 'success';
  } else if (effectiveStatus === 'PENDING') {
    statusText = isCurrentlyWorking ? 'Pending (In Progress)' : 'Pending (Session Paused)';
    statusTone = 'info';
  } else if (effectiveStatus === 'HALF_DAY' || metrics?.subStatus === 'HALF_DAY_FINALIZED') {
    statusText = 'Half Day Recorded';
    statusTone = 'warning';
  } else if (metrics?.subStatus === 'HALF_DAY_ELIGIBLE') {
    statusText = 'Half Day Eligible / Working';
    statusTone = 'warning';
  } else if (isCurrentlyWorking) {
    statusText = `Currently Working · In: ${punches[0]?.locationName || 'Office'}`;
    statusTone = 'processing';
  } else if (hasStartedDay) {
    statusText = 'On Break (Punched Out)';
    statusTone = 'warning';
  }

  const firstInTime = metrics?.firstIn || attendance?.punchIn?.time;
  const lastOutTime = metrics?.lastOut || (isCurrentlyWorking ? null : attendance?.punchOut?.time);

  return (
    <section className="punch-screen">
      <h1 className="visually-hidden">Punch In / Out</h1>

      <Card className="punch-screen__card">
        <p className="punch-screen__date">
          {WEEKDAYS[new Date(`${today.date}T00:00:00`).getDay()]}, {formatDate(today.date)}
        </p>
        <Clock />

        <div className="punch-screen__status-tag-row">
          <Badge tone={statusTone === 'processing' ? 'success' : statusTone}>
            {statusText}
          </Badge>
        </div>

        {/* Live Working Hours Display */}
        <LiveWorkingTimer
          isWorking={isCurrentlyWorking}
          baseMinutes={metrics?.completedWorkMinutes || 0}
          lastInTime={lastInPunch?.time}
          requiredMinutes={metrics?.requiredWorkMinutes || workingHoursConfig?.requiredWorkMinutes || 510}
        />

        {isOffDay && (
          <div style={{ marginBottom: 12 }}>
            <Alert tone="warning">{offDayReason}</Alert>
          </div>
        )}

        {outsideHours && !isOffDay && (
          <div style={{ marginBottom: 12 }}>
            <Alert tone="warning">{workHoursStatus.message}</Alert>
          </div>
        )}

        {message.text && (
          <div style={{ marginBottom: 12 }}>
            <Alert type={message.type}>{message.text}</Alert>
          </div>
        )}

        {/* Map area */}
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
                    {nearest.inside ? 'Inside radius' : 'Outside radius'}
                  </Badge>
                  <span>
                    {nearest.distance}m from {nearest.location.name} (allowed: {nearest.location.radius}m)
                  </span>
                </>
              ) : (
                <span>{positionError || 'Finding your GPS coordinates...'}</span>
              )}
            </p>
            <div className="punch-screen__refresh">
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

        {/* Action Punch Button */}
        <Button
          block
          type={isPunchBlocked ? 'default' : 'primary'}
          danger={isCurrentlyWorking}
          className={`punch-screen__button punch-screen__button--${isCurrentlyWorking ? 'out' : 'in'}`}
          loading={Boolean(step)}
          disabled={noLocation || isPunchBlocked}
          onClick={handlePunch}
          icon={isCurrentlyWorking ? <LogoutOutlined /> : <LoginOutlined />}
        >
          {isPunchBlocked
            ? holidayName
              ? 'Punch Disabled (Holiday)'
              : isOffDay
              ? `Punch Disabled (${displayWeekOffName})`
              : 'Punch Disabled (Outside Working Hours)'
            : buttonLabel}
        </Button>

        {/* Metrics Overview Grid */}
        <div className="punch-screen__metrics-grid">
          <div className="punch-screen__metric-box">
            <div className="punch-screen__metric-icon punch-screen__metric-icon--in">
              <LoginOutlined />
            </div>
            <div className="punch-screen__metric-info">
              <span className="punch-screen__metric-lbl">First In</span>
              <span className="punch-screen__metric-value">
                {firstInTime ? formatTime(firstInTime) : '--:--'}
              </span>
            </div>
          </div>

          <div className="punch-screen__metric-box">
            <div className="punch-screen__metric-icon punch-screen__metric-icon--out">
              <LogoutOutlined />
            </div>
            <div className="punch-screen__metric-info">
              <span className="punch-screen__metric-lbl">Last Out</span>
              <span className="punch-screen__metric-value">
                {lastOutTime ? formatTime(lastOutTime) : isCurrentlyWorking ? 'Working...' : '--:--'}
              </span>
            </div>
          </div>

          <div className="punch-screen__metric-box">
            <div className="punch-screen__metric-icon punch-screen__metric-icon--break">
              <CoffeeOutlined />
            </div>
            <div className="punch-screen__metric-info">
              <span className="punch-screen__metric-lbl">Lunch / Break</span>
              <span className="punch-screen__metric-value">
                {metrics ? `${metrics.totalBreakMinutes || 0}m` : '0m'}
              </span>
            </div>
          </div>

          <div className="punch-screen__metric-box">
            <div className="punch-screen__metric-icon punch-screen__metric-icon--events">
              <HistoryOutlined />
            </div>
            <div className="punch-screen__metric-info">
              <span className="punch-screen__metric-lbl">Total Punches</span>
              <span className="punch-screen__metric-value">
                {punches.length} {punches.length === 1 ? 'event' : 'events'}
              </span>
            </div>
          </div>

          <div className="punch-screen__metric-box">
            <div className="punch-screen__metric-icon punch-screen__metric-icon--in">
              <CheckCircleOutlined />
            </div>
            <div className="punch-screen__metric-info">
              <span className="punch-screen__metric-lbl">Final Status</span>
              <span className="punch-screen__metric-value">
                {effectiveStatus === 'PRESENT' ? 'Present' : effectiveStatus === 'ABSENT' ? 'Absent' : effectiveStatus === 'PENDING' ? 'Pending' : effectiveStatus === 'LEAVE' ? 'On Leave' : effectiveStatus || 'Not Marked'}
              </span>
            </div>
          </div>

          <div className="punch-screen__metric-box">
            <div className="punch-screen__metric-icon punch-screen__metric-icon--events">
              <FieldTimeOutlined />
            </div>
            <div className="punch-screen__metric-info">
              <span className="punch-screen__metric-lbl">GPS Verification</span>
              <span className="punch-screen__metric-value">
                {nearest ? (nearest.inside ? 'Verified In-Range' : 'Out of Range') : 'Locating...'}
              </span>
            </div>
          </div>
        </div>

        {/* Today's Punch History Timeline */}
        {punches.length > 0 && (
          <div className="punch-screen__timeline-wrap">
            <div className="punch-screen__timeline-title">
              <HistoryOutlined /> Today's Punch Activity
            </div>
            <div className="punch-screen__timeline-list">
              {punches.map((p, idx) => {
                const isIn = p.type === 'IN';
                return (
                  <div key={idx} className="punch-screen__timeline-row">
                    <span className={`punch-screen__timeline-badge punch-screen__timeline-badge--${isIn ? 'in' : 'out'}`}>
                      {isIn ? 'PUNCH IN' : 'PUNCH OUT'}
                    </span>
                    <span className="punch-screen__timeline-time">{formatTime(p.time)}</span>
                    <span className="punch-screen__timeline-loc">
                      {p.locationName || 'Office'} · {p.distance != null ? `${p.distance}m` : 'GPS OK'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>
    </section>
  );
}
