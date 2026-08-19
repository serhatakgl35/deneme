import { useCallback, useEffect, useRef, useState } from 'react';
import {
  MAX_DAY_LEAVE_RETURN_PHOTO_BYTES,
  dayLeaveReturnErrorText
} from '../lib/dayLeaveReturn';
import styles from './DayLeaveReturn.module.css';

export type CapturedDayLeavePhoto = {
  base64: string;
  mimeType: 'image/jpeg';
  size: number;
};

type Props = {
  onCancel: () => void;
  onSubmit: (photo: CapturedDayLeavePhoto) => Promise<void>;
};

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error('Fotoğraf oluşturulamadı.'));
    }, 'image/jpeg', quality);
  });
}

async function createSizedJpeg(canvas: HTMLCanvasElement) {
  let latest: Blob | null = null;
  for (const quality of [0.78, 0.68, 0.58, 0.48]) {
    latest = await canvasToJpeg(canvas, quality);
    if (latest.size <= MAX_DAY_LEAVE_RETURN_PHOTO_BYTES) return latest;
  }
  if (!latest || latest.size > MAX_DAY_LEAVE_RETURN_PHOTO_BYTES) {
    throw new Error('Fotoğraf küçültülemedi. Kamerayı sabit tutup tekrar deneyin.');
  }
  return latest;
}

function blobToBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Fotoğraf okunamadı.'));
    reader.onload = () => {
      const value = String(reader.result ?? '');
      const comma = value.indexOf(',');
      if (comma < 0) reject(new Error('Fotoğraf okunamadı.'));
      else resolve(value.slice(comma + 1));
    };
    reader.readAsDataURL(blob);
  });
}

export function DayLeaveReturnCamera({ onCancel, onSubmit }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraRequestRef = useRef(0);
  const [cameraReady, setCameraReady] = useState(false);
  const [captured, setCaptured] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const stopCamera = useCallback((updateState = true) => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    if (updateState) setCameraReady(false);
  }, []);

  const startCamera = useCallback(async () => {
    const requestId = ++cameraRequestRef.current;
    stopCamera();
    setCaptured(null);
    setError('');
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      throw new Error('Kamera bu tarayıcıda açılamadı. Siteyi güvenli HTTPS bağlantısıyla açın.');
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: 'user' },
        width: { ideal: 1280 },
        height: { ideal: 1280 }
      }
    });
    if (requestId !== cameraRequestRef.current) {
      stream.getTracks().forEach(track => track.stop());
      return;
    }
    if (!videoRef.current) {
      stream.getTracks().forEach(track => track.stop());
      return;
    }
    const video = videoRef.current;
    streamRef.current = stream;
    video.srcObject = stream;
    try {
      await video.play();
    } catch (reason) {
      stream.getTracks().forEach(track => track.stop());
      if (streamRef.current === stream) streamRef.current = null;
      if (video.srcObject === stream) video.srcObject = null;
      throw reason;
    }
    if (requestId !== cameraRequestRef.current) {
      stream.getTracks().forEach(track => track.stop());
      return;
    }
    setCameraReady(true);
  }, [stopCamera]);

  useEffect(() => {
    let active = true;
    void startCamera().catch(reason => {
      if (active) setError(dayLeaveReturnErrorText(reason));
    });
    return () => {
      active = false;
      cameraRequestRef.current += 1;
      stopCamera(false);
    };
  }, [startCamera, stopCamera]);

  useEffect(() => {
    if (!captured) {
      setPreviewUrl('');
      return;
    }
    const url = URL.createObjectURL(captured);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [captured]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onCancel();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [busy, onCancel]);

  async function capture() {
    const video = videoRef.current;
    if (!video || !cameraReady || !video.videoWidth || !video.videoHeight) return;
    setError('');
    try {
      const longestSide = Math.max(video.videoWidth, video.videoHeight);
      const scale = Math.min(1, 1280 / longestSide);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
      canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Fotoğraf hazırlanamadı.');
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await createSizedJpeg(canvas);
      setCaptured(blob);
      stopCamera();
    } catch (reason) {
      setError(dayLeaveReturnErrorText(reason));
    }
  }

  async function submit() {
    if (!captured) return;
    setBusy(true);
    setError('');
    try {
      const base64 = await blobToBase64(captured);
      await onSubmit({ base64, mimeType: 'image/jpeg', size: captured.size });
    } catch (reason) {
      setError(dayLeaveReturnErrorText(reason));
    } finally {
      setBusy(false);
    }
  }

  return <div className={styles.backdrop} role="dialog" aria-modal="true" aria-label="Günübirlik izin dönüş fotoğrafı">
    <section className={styles.cameraSheet}>
      <header className={styles.sheetHead}>
        <div><span>GÜNÜBİRLİK İZİN</span><h3>Dönüş Fotoğrafı</h3></div>
        <button type="button" onClick={onCancel} disabled={busy} aria-label="Kapat">×</button>
      </header>

      <p className={styles.cameraHint}>Fotoğraf yalnızca canlı kameradan çekilir. Galeri veya dosya seçimi bulunmaz.</p>
      {error ? <div className={styles.error}>{error}</div> : null}

      <div className={styles.cameraFrame}>
        {!captured ? <>
          <video ref={videoRef} autoPlay muted playsInline className={styles.liveVideo}/>
          {!cameraReady && !error ? <div className={styles.cameraLoading}>Kamera açılıyor…</div> : null}
        </> : <img src={previewUrl} alt="Çekilen dönüş fotoğrafı"/>}
      </div>

      <div className={styles.cameraActions}>
        <button type="button" className={styles.secondaryButton} onClick={onCancel} disabled={busy}>Vazgeç</button>
        {!captured
          ? <button type="button" className={styles.captureButton} onClick={() => void capture()} disabled={!cameraReady || busy}>Fotoğraf Çek</button>
          : <>
            <button type="button" className={styles.secondaryButton} onClick={() => void startCamera().catch(reason => setError(dayLeaveReturnErrorText(reason)))} disabled={busy}>Tekrar Çek</button>
            <button type="button" className={styles.confirmButton} onClick={() => void submit()} disabled={busy}>{busy ? 'Kaydediliyor…' : 'Dönüşü Onayla'}</button>
          </>}
      </div>
    </section>
  </div>;
}
