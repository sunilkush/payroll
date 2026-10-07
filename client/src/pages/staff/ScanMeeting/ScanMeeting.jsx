import { useState } from 'react';
import { CheckCircleFilled } from '@ant-design/icons';
import { Card } from 'antd';
import { useNavigate } from 'react-router-dom';
import { scanMeetingApi } from '../../../api/meetingApi.js';
import Alert from '../../../components/Alert/Alert.jsx';
import Button from '../../../components/Button/Button.jsx';
import Loader from '../../../components/Loader/Loader.jsx';
import PageHeader from '../../../components/PageHeader/PageHeader.jsx';
import QrScanner from '../../../components/QrScanner/QrScanner.jsx';
import { formatDate, formatTime } from '../../../utils/format.js';
import './ScanMeeting.css';

// Sales manager: meeting ka QR scan karta hai. QR ke andar sirf ek code hota hai; meeting ki
// jaankari aur "check-in ho sakta hai ya nahi" server batata hai.
export default function ScanMeeting() {
  const navigate = useNavigate();
  // scan | verifying | result | error
  const [step, setStep] = useState('scan');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleScan = async (text) => {
    setStep('verifying');
    try {
      const res = await scanMeetingApi(text.trim());
      setResult(res.data);
      setStep('result');
    } catch (err) {
      // Meeting QR na ho (koi aur QR) to server ka validation message hi kaafi saaf hai.
      setError(err.errors?.[0]?.message || err.message);
      setStep('error');
    }
  };

  const scanAgain = () => {
    setResult(null);
    setError('');
    setStep('scan');
  };

  const meeting = result?.meeting;

  return (
    <section className="scan-meeting">
      <PageHeader title="Scan Meeting QR" subtitle="Scan the QR your admin sent when you reach the client" />

      {step === 'scan' && <QrScanner onScan={handleScan} />}

      {step === 'verifying' && (
        <div className="scan-meeting__center">
          <Loader />
          <p>Checking the QR...</p>
        </div>
      )}

      {step === 'error' && (
        <div className="scan-meeting__center">
          <Alert>{error}</Alert>
          <div className="scan-meeting__actions">
            <Button onClick={scanAgain}>Scan Again</Button>
            <Button variant="secondary" onClick={() => navigate('/staff/meetings')}>
              My Meetings
            </Button>
          </div>
        </div>
      )}

      {step === 'result' && (
        <>
          <Card size="small" className="scan-meeting__card">
            <p className="scan-meeting__verified">
              <CheckCircleFilled /> {result.alreadyCheckedIn ? 'You are checked in to this meeting' : 'QR verified'}
            </p>
            <h2 className="scan-meeting__client">{meeting.client?.name}</h2>
            <p className="scan-meeting__title">{meeting.title}</p>
            <dl className="scan-meeting__facts">
              <dt>When</dt>
              <dd>
                {formatDate(meeting.date)}, {formatTime(meeting.startAt)} - {formatTime(meeting.endAt)}
              </dd>
              <dt>Where</dt>
              <dd>
                {meeting.location.name}
                {meeting.location.address && <span className="scan-meeting__muted"> · {meeting.location.address}</span>}
              </dd>
              {meeting.contactPerson && (
                <>
                  <dt>Meet</dt>
                  <dd>
                    {meeting.contactPerson}
                    {meeting.contactPhone && (
                      <>
                        {' · '}
                        <a href={`tel:${meeting.contactPhone}`}>{meeting.contactPhone}</a>
                      </>
                    )}
                  </dd>
                </>
              )}
              {result.alreadyCheckedIn && (
                <>
                  <dt>Checked in</dt>
                  <dd>{formatTime(meeting.checkIn.at)}</dd>
                </>
              )}
            </dl>
            {meeting.notes && <p className="scan-meeting__muted">Note from admin: {meeting.notes}</p>}
          </Card>

          {result.canCheckIn && (
            <Alert type="info">
              You must be within {meeting.location.radius} m of the meeting location to check in. Check-in is open until{' '}
              {formatTime(meeting.checkInClosesAt)}.
            </Alert>
          )}

          <div className="scan-meeting__actions">
            <Button variant="secondary" onClick={scanAgain}>
              Scan Another QR
            </Button>
            <Button variant="secondary" onClick={() => navigate('/staff/meetings')}>
              My Meetings
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
