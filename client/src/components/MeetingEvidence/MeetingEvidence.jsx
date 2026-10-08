import { useEffect, useRef, useState } from 'react';
import { CameraOutlined, DeleteOutlined, PaperClipOutlined } from '@ant-design/icons';
import { Card } from 'antd';
import {
  getMeetingFileApi,
  removeAttachmentApi,
  uploadAttachmentApi,
  uploadVisitPhotoApi,
} from '../../api/meetingApi.js';
import { formatDate, formatTime } from '../../utils/format.js';
import { getCurrentPosition } from '../../utils/geolocation.js';
import { useFeedback } from '../../utils/useFeedback.js';
import Alert from '../Alert/Alert.jsx';
import Button from '../Button/Button.jsx';
import CameraCapture from '../CameraCapture/CameraCapture.jsx';
import './MeetingEvidence.css';

const MAX_ATTACHMENTS = 5;
const LOCATION_WAIT_MS = 6000;

const formatSize = (bytes) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);

// Photo ke saath location jaye to achha, lekin uske liye photo ko zyada der na rokein.
const quickPosition = () =>
  Promise.race([getCurrentPosition(), new Promise((resolve) => setTimeout(resolve, LOCATION_WAIT_MS))]).catch(() => undefined);

// Login token ke saath photo laakar dikhata hai. version badle (dobara li) to phir se laata hai.
function VisitPhoto({ meetingId, version }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    let objectUrl;
    let ignore = false;
    getMeetingFileApi(meetingId)
      .then((blob) => {
        if (ignore) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => !ignore && setUrl(''));
    return () => {
      ignore = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [meetingId, version]);

  if (!url) return <div className="meeting-evidence__photo meeting-evidence__photo--loading" />;
  return (
    <a href={url} target="_blank" rel="noreferrer">
      <img className="meeting-evidence__photo" src={url} alt="Visit" />
    </a>
  );
}

// Visit ka saboot: ek photo aur kuch attachments.
//   editable  sales manager, visit ke dauran: photo lena / dobara lena, attachment jodna / hatana
//   required  company ne visit photo zaroori ki hai
//   error     server ka "photo zaroori hai" wala message (check-out fail hone par)
//   onChange(meeting)  server se aayi nayi meeting
// Padhne wale (admin, poori hui visit) ko sirf photo aur files dikhti hain; kuch na ho to card hi nahi banta.
export default function MeetingEvidence({ meeting, editable = false, required = false, error, onChange }) {
  const { toast, confirm } = useFeedback();
  const fileRef = useRef(null);
  const [shooting, setShooting] = useState(false);
  const [busy, setBusy] = useState('');

  const photo = meeting.visitPhoto;
  const attachments = meeting.attachments ?? [];
  if (!editable && !photo && attachments.length === 0) return null;

  const run = async (name, action) => {
    setBusy(name);
    try {
      const res = await action();
      onChange?.(res.data.meeting);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy('');
    }
  };

  const handleCapture = (blob, source) => {
    setShooting(false);
    run('photo', async () => {
      const position = await quickPosition();
      return uploadVisitPhotoApi(meeting._id, blob, { lat: position?.lat, lng: position?.lng, source });
    });
  };

  const handleAttach = (event) => {
    const [file] = event.target.files;
    event.target.value = '';
    if (file) run('attach', () => uploadAttachmentApi(meeting._id, file));
  };

  const handleRemove = async (file) => {
    const ok = await confirm({ title: `Remove ${file.name}?`, okText: 'Remove', danger: true });
    if (ok) run(file._id, () => removeAttachmentApi(meeting._id, file._id));
  };

  // Attachment login token ke saath laakar download karata hai (api/download.js jaisa).
  const openFile = async (file) => {
    try {
      const url = URL.createObjectURL(await getMeetingFileApi(meeting._id, file._id));
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <Card size="small" className="meeting-evidence" title={editable ? `Visit Photo${required ? ' (required)' : ''}` : 'Evidence'}>
      <Alert>{error}</Alert>

      {shooting ? (
        <CameraCapture onCapture={handleCapture} onCancel={() => setShooting(false)} />
      ) : (
        <>
          {photo ? (
            <div className="meeting-evidence__shot">
              <VisitPhoto meetingId={meeting._id} version={photo.uploadedAt} />
              <p className="meeting-evidence__muted">
                {photo.source === 'camera' ? 'Taken in the app' : 'Uploaded file'} · {formatDate(photo.uploadedAt)},{' '}
                {formatTime(photo.uploadedAt)}
                {photo.lat != null && ` · ${photo.lat.toFixed(5)}, ${photo.lng.toFixed(5)}`}
              </p>
            </div>
          ) : (
            editable && <p className="meeting-evidence__muted">Take a photo at the client&apos;s location as proof of the visit.</p>
          )}
          {editable && (
            <Button
              className="meeting-evidence__big"
              variant={photo ? 'secondary' : 'primary'}
              icon={<CameraOutlined />}
              loading={busy === 'photo'}
              onClick={() => setShooting(true)}
            >
              {photo ? 'Retake Photo' : 'Take Visit Photo'}
            </Button>
          )}
        </>
      )}

      {(editable || attachments.length > 0) && (
        <div className="meeting-evidence__files">
          <p className="meeting-evidence__label">Attachments</p>
          {attachments.length === 0 && <p className="meeting-evidence__muted">No attachments.</p>}
          <ul className="meeting-evidence__list">
            {attachments.map((file) => (
              <li key={file._id}>
                <button type="button" className="meeting-evidence__file" onClick={() => openFile(file)}>
                  <PaperClipOutlined /> {file.name}
                </button>
                <span className="meeting-evidence__muted">{formatSize(file.size)}</span>
                {editable && (
                  <Button
                    size="sm"
                    variant="danger"
                    icon={<DeleteOutlined />}
                    aria-label={`Remove ${file.name}`}
                    loading={busy === file._id}
                    onClick={() => handleRemove(file)}
                  />
                )}
              </li>
            ))}
          </ul>
          {editable && attachments.length < MAX_ATTACHMENTS && (
            <>
              <Button variant="secondary" icon={<PaperClipOutlined />} loading={busy === 'attach'} onClick={() => fileRef.current.click()}>
                Add Attachment
              </Button>
              <p className="meeting-evidence__muted">Photo or PDF, up to 5 MB each. Up to {MAX_ATTACHMENTS} files.</p>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="visually-hidden"
                aria-label="Attachment"
                onChange={handleAttach}
              />
            </>
          )}
        </div>
      )}
    </Card>
  );
}
