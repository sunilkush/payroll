import { useEffect, useRef, useState } from 'react';
import { CameraOutlined, PictureOutlined } from '@ant-design/icons';
import { Upload } from 'antd';
import QrScannerLib from 'qr-scanner';
import Alert from '../Alert/Alert.jsx';
import Button from '../Button/Button.jsx';
import './QrScanner.css';

const MESSAGES = {
  denied: 'Camera permission is blocked. Allow the camera for this site in your browser settings, then tap "Try Camera Again".',
  missing: 'No camera was found on this device. You can upload a photo or screenshot of the QR instead.',
  insecure: 'The camera works only on a secure (https) connection. You can upload a photo or screenshot of the QR instead.',
  failed: 'Could not start the camera. Close other apps that are using it and try again.',
};

// Camera start na ho to wajah: permission mana, camera nahi, ya kuch aur.
function reasonFor(error) {
  const name = error?.name ?? '';
  const text = String(error?.message ?? error ?? '');
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'denied';
  if (name === 'NotFoundError' || name === 'OverconstrainedError' || /not found/i.test(text)) return 'missing';
  return 'failed';
}

// Phone ke camera se QR padhta hai. QR mil jaye to onScan(text) ek baar chalta hai aur camera ruk jata hai;
// dobara scan karna ho to parent is component ko naya `key` dekar phir se lagata hai.
// Camera na chale (permission mana / camera nahi / http) to QR ki photo upload karne ka raasta hai.
export default function QrScanner({ onScan }) {
  const videoRef = useRef(null);
  // onScan badle to camera dobara start na ho
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  // starting | scanning | denied | missing | insecure | failed
  const [state, setState] = useState('starting');
  const [attempt, setAttempt] = useState(0);
  const [fileError, setFileError] = useState('');

  useEffect(() => {
    // Browser camera sirf https (ya localhost) par deta hai.
    if (!navigator.mediaDevices?.getUserMedia) {
      setState('insecure');
      return undefined;
    }

    let done = false;
    setState('starting');
    const scanner = new QrScannerLib(
      videoRef.current,
      (result) => {
        if (done) return;
        done = true;
        scanner.stop();
        onScanRef.current(result.data);
      },
      {
        preferredCamera: 'environment', // peeche wala camera
        maxScansPerSecond: 5,
        highlightScanRegion: true,
        highlightCodeOutline: true,
        returnDetailedScanResult: true,
      }
    );
    scanner
      .start()
      .then(() => !done && setState('scanning'))
      .catch((error) => !done && setState(reasonFor(error)));

    return () => {
      done = true;
      scanner.destroy();
    };
  }, [attempt]);

  // Upload ka beforeUpload: file yahin browser mein padhte hain, server par kuch nahi jata (isliye false).
  const handleFile = async (file) => {
    setFileError('');
    try {
      const result = await QrScannerLib.scanImage(file, { returnDetailedScanResult: true });
      onScanRef.current(result.data);
    } catch {
      setFileError('No QR code was found in that image. Try a clearer photo or screenshot.');
    }
  };

  const live = state === 'starting' || state === 'scanning';

  return (
    <div className="qr-scanner">
      <div className={`qr-scanner__frame${live ? '' : ' qr-scanner__frame--off'}`}>
        {/* playsInline: iPhone par video poori screen na le le */}
        <video ref={videoRef} className="qr-scanner__video" muted playsInline />
        {state === 'starting' && <p className="qr-scanner__status">Starting camera...</p>}
        {!live && (
          <p className="qr-scanner__status">
            <CameraOutlined /> Camera is off
          </p>
        )}
      </div>

      {state === 'scanning' && <p className="qr-scanner__hint">Point the camera at the meeting QR.</p>}
      {!live && <Alert type={state === 'denied' || state === 'failed' ? 'error' : 'info'}>{MESSAGES[state]}</Alert>}
      <Alert>{fileError}</Alert>

      <div className="qr-scanner__actions">
        {(state === 'denied' || state === 'failed') && (
          <Button icon={<CameraOutlined />} onClick={() => setAttempt((count) => count + 1)}>
            Try Camera Again
          </Button>
        )}
        <Upload
          accept="image/*"
          showUploadList={false}
          beforeUpload={(file) => {
            handleFile(file);
            return false;
          }}
        >
          <Button variant="secondary" icon={<PictureOutlined />}>
            Upload QR Image
          </Button>
        </Upload>
      </div>
    </div>
  );
}
