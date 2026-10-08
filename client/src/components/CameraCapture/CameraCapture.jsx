import { useEffect, useRef, useState } from 'react';
import { CameraOutlined, PictureOutlined } from '@ant-design/icons';
import { Upload } from 'antd';
import Alert from '../Alert/Alert.jsx';
import Button from '../Button/Button.jsx';
import './CameraCapture.css';

const MAX_SIDE = 1600; // photo ki sabse lambi side, pixels (upload chhota rahe)

const MESSAGES = {
  denied: 'Camera permission is blocked. Allow the camera for this site in your browser settings and try again.',
  missing: 'No camera was found on this device.',
  insecure: 'The camera works only on a secure (https) connection.',
  failed: 'Could not start the camera. Close other apps that are using it and try again.',
};

function reasonFor(error) {
  if (error?.name === 'NotAllowedError' || error?.name === 'SecurityError') return 'denied';
  if (error?.name === 'NotFoundError' || error?.name === 'OverconstrainedError') return 'missing';
  return 'failed';
}

// Kisi bhi image (video frame ya chuni hui file) ko chhota karke JPEG blob banata hai.
function toJpeg(source, width, height) {
  const scale = Math.min(1, MAX_SIDE / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  canvas.getContext('2d').drawImage(source, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
}

// App ke andar camera se photo: seedha camera chalta hai, gallery nahi khulti (purani photo na chadhe).
// Camera na chale to hi file chunne ka raasta milta hai, aur wo 'upload' ke naam se darj hota hai.
//   onCapture(blob, source)  source: 'camera' | 'upload'
export default function CameraCapture({ onCapture, onCancel }) {
  const videoRef = useRef(null);
  // starting | live | denied | missing | insecure | failed
  const [state, setState] = useState('starting');
  const [attempt, setAttempt] = useState(0);
  const [fileError, setFileError] = useState('');

  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setState('insecure');
      return undefined;
    }
    let stream;
    let stopped = false;
    setState('starting');
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      .then((media) => {
        if (stopped) {
          media.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = media;
        videoRef.current.srcObject = media;
        setState('live');
      })
      .catch((error) => !stopped && setState(reasonFor(error)));

    // Page chhodte hi camera band (warna phone ki camera batti jalti rehti hai)
    return () => {
      stopped = true;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [attempt]);

  const handleShoot = async () => {
    const video = videoRef.current;
    if (!video.videoWidth) return;
    onCapture(await toJpeg(video, video.videoWidth, video.videoHeight), 'camera');
  };

  const handleFile = async (file) => {
    setFileError('');
    try {
      const image = await createImageBitmap(file);
      onCapture(await toJpeg(image, image.width, image.height), 'upload');
    } catch {
      setFileError('That file is not a photo. Choose a JPG or PNG image.');
    }
  };

  const live = state === 'starting' || state === 'live';

  return (
    <div className="camera-capture">
      <div className={`camera-capture__frame${live ? '' : ' camera-capture__frame--off'}`}>
        {/* playsInline: iPhone par video poori screen na le le */}
        <video ref={videoRef} className="camera-capture__video" autoPlay muted playsInline />
        {state === 'starting' && <p className="camera-capture__status">Starting camera...</p>}
        {!live && (
          <p className="camera-capture__status">
            <CameraOutlined /> Camera is off
          </p>
        )}
      </div>

      {!live && <Alert type={state === 'denied' || state === 'failed' ? 'error' : 'info'}>{MESSAGES[state]}</Alert>}
      <Alert>{fileError}</Alert>

      <div className="camera-capture__actions">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        {live ? (
          <Button icon={<CameraOutlined />} disabled={state !== 'live'} onClick={handleShoot}>
            Take Photo
          </Button>
        ) : (
          <>
            {(state === 'denied' || state === 'failed') && (
              <Button onClick={() => setAttempt((count) => count + 1)}>Try Camera Again</Button>
            )}
            {/* capture: phone par seedha camera khule */}
            <Upload
              accept="image/*"
              capture="environment"
              showUploadList={false}
              beforeUpload={(file) => {
                handleFile(file);
                return false;
              }}
            >
              <Button variant="secondary" icon={<PictureOutlined />}>
                Choose a Photo
              </Button>
            </Upload>
          </>
        )}
      </div>
    </div>
  );
}
