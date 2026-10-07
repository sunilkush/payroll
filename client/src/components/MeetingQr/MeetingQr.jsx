import { useEffect, useState } from 'react';
import { DownloadOutlined, ReloadOutlined, SendOutlined, ShareAltOutlined } from '@ant-design/icons';
import { Card } from 'antd';
import QRCode from 'qrcode';
import { getMeetingQrApi, markMeetingQrSentApi, regenerateMeetingQrApi } from '../../api/meetingApi.js';
import { formatDate, formatTime } from '../../utils/format.js';
import { useFeedback } from '../../utils/useFeedback.js';
import Alert from '../Alert/Alert.jsx';
import Button from '../Button/Button.jsx';
import './MeetingQr.css';

const dateTime = (value) => `${formatDate(value)}, ${formatTime(value)}`;

// Download / share ke liye ek tasveer: upar meeting ki jaankari, beech mein QR, neeche kya karna hai.
// (QR ke andar sirf token hai; ye likha hua hissa sirf insaan ke padhne ke liye hai.)
async function buildCard(meeting, qr) {
  const width = 720;
  const height = 940;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.textAlign = 'center';

  // Lamba naam card se bahar na jaye
  const line = (text, y, font, color) => {
    ctx.font = font;
    ctx.fillStyle = color;
    let shown = text;
    while (ctx.measureText(shown).width > width - 80 && shown.length > 4) shown = `${shown.slice(0, -2).trimEnd()}…`;
    ctx.fillText(shown, width / 2, y);
  };

  line('Meeting QR', 64, '600 26px sans-serif', '#6b7280');
  line(meeting.clientId?.name ?? 'Client meeting', 112, '700 36px sans-serif', '#111827');
  line(`${formatDate(meeting.date)}  ·  ${formatTime(meeting.startAt)} - ${formatTime(meeting.endAt)}`, 158, '500 26px sans-serif', '#374151');
  line(`For: ${meeting.salesManagerId?.name ?? ''}`, 198, '500 24px sans-serif', '#374151');

  const qrCanvas = document.createElement('canvas');
  await QRCode.toCanvas(qrCanvas, qr.token, { width: 560, margin: 2, errorCorrectionLevel: 'M' });
  ctx.drawImage(qrCanvas, (width - 560) / 2, 230);

  line('Open PayRoster at the client location and scan this QR to check in.', 838, '500 21px sans-serif', '#374151');
  line(`Valid until ${dateTime(qr.expiresAt)}`, 878, '500 21px sans-serif', '#6b7280');

  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

const fileName = (meeting) =>
  `meeting-qr-${(meeting.clientId?.name ?? 'client').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${meeting.date}.png`;

// Meeting ka QR (sirf admin; sirf check-in se pehle). Download, share, "sent" mark karna aur naya QR banana.
// onChange(meeting): server se aayi nayi meeting (status / audit history badalti hai).
export default function MeetingQr({ meeting, onChange }) {
  const { toast, confirm } = useFeedback();
  const [qr, setQr] = useState(null);
  const [image, setImage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  useEffect(() => {
    let ignore = false;
    getMeetingQrApi(meeting._id)
      .then((res) => !ignore && setQr(res.data.qr))
      .catch((err) => !ignore && setError(err.message));
    return () => {
      ignore = true;
    };
    // qr.version: sales manager badalne par server naya QR banata hai
  }, [meeting._id, meeting.qr?.version]);

  useEffect(() => {
    if (!qr) return;
    QRCode.toDataURL(qr.token, { width: 320, margin: 2, errorCorrectionLevel: 'M' }).then(setImage);
  }, [qr]);

  // Server ka jawab { meeting, qr } dono yahan lagte hain.
  const apply = ({ data }) => {
    setQr(data.qr);
    onChange(data.meeting);
  };

  const run = async (name, action) => {
    setBusy(name);
    try {
      await action();
    } catch (err) {
      // Share sheet band kar dena galti nahi hai.
      if (err.name !== 'AbortError') toast.error(err.message);
    } finally {
      setBusy('');
    }
  };

  const handleDownload = () =>
    run('download', async () => {
      const url = URL.createObjectURL(await buildCard(meeting, qr));
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName(meeting);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    });

  const handleShare = () =>
    run('share', async () => {
      const file = new File([await buildCard(meeting, qr)], fileName(meeting), { type: 'image/png' });
      if (!navigator.canShare?.({ files: [file] })) {
        toast.info('Sharing is not available in this browser. Download the QR and send it yourself.');
        return;
      }
      await navigator.share({
        files: [file],
        title: `Meeting QR: ${meeting.clientId?.name ?? ''}`,
        text: `QR for your meeting with ${meeting.clientId?.name ?? 'the client'} on ${formatDate(meeting.date)} at ${formatTime(meeting.startAt)}.`,
      });
      apply(await markMeetingQrSentApi(meeting._id, 'share'));
      toast.success('QR shared and marked as sent.');
    });

  const handleMarkSent = () =>
    run('sent', async () => {
      apply(await markMeetingQrSentApi(meeting._id, 'other'));
      toast.success('Marked as sent.');
    });

  const handleRegenerate = async () => {
    const ok = await confirm({
      title: 'Generate a new QR?',
      content: 'The current QR stops working immediately. You will have to send the new one to the sales manager.',
      okText: 'Generate New QR',
      danger: true,
    });
    if (!ok) return;
    run('regenerate', async () => {
      apply(await regenerateMeetingQrApi(meeting._id));
      toast.success('New QR generated. The old one no longer works.');
    });
  };

  return (
    <Card className="meeting-qr" size="small" title="Meeting QR">
      <Alert>{error}</Alert>
      {qr && (
        <div className="meeting-qr__body">
          <div className="meeting-qr__code">
            {image && <img src={image} alt="Meeting QR code" width="240" height="240" />}
          </div>
          <div className="meeting-qr__info">
            {qr.expired && <Alert>This QR has expired. Change the meeting time to make it valid again.</Alert>}
            <p>
              Send this QR to <strong>{meeting.salesManagerId?.name}</strong>. They scan it in the app at the client
              location to check in.
            </p>
            <dl className="meeting-qr__facts">
              <dt>Valid until</dt>
              <dd>{dateTime(qr.expiresAt)}</dd>
              <dt>Sent</dt>
              <dd>{qr.sentAt ? dateTime(qr.sentAt) : 'Not sent yet'}</dd>
            </dl>
            <p className="meeting-qr__note">
              The QR works only for this sales manager, on the meeting day, inside the geofence. It holds a random
              code only, no meeting details.
            </p>
            <div className="meeting-qr__actions">
              <Button icon={<ShareAltOutlined />} loading={busy === 'share'} onClick={handleShare}>
                Share QR
              </Button>
              <Button variant="secondary" icon={<DownloadOutlined />} loading={busy === 'download'} onClick={handleDownload}>
                Download QR
              </Button>
              {!qr.sentAt && (
                <Button variant="secondary" icon={<SendOutlined />} loading={busy === 'sent'} onClick={handleMarkSent}>
                  Mark as Sent
                </Button>
              )}
              <Button variant="secondary" icon={<ReloadOutlined />} loading={busy === 'regenerate'} onClick={handleRegenerate}>
                Regenerate QR
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
