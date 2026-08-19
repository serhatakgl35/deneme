import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { dayLeaveReturnErrorText, formatTurkeyDateTime } from '../lib/dayLeaveReturn';
import styles from './DayLeaveReturn.module.css';

type PhotoRow = {
  photo_base64: string | null;
  photo_mime_type: string | null;
  returned_at: string;
  photo_expires_at: string;
  photo_deleted_at: string | null;
};

type Props = {
  leaveRequestId: string;
  personLabel: string;
  onClose: () => void;
};

export function DayLeaveReturnPhotoModal({ leaveRequestId, personLabel, onClose }: Props) {
  const [row, setRow] = useState<PhotoRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      if (!supabase) {
        setError('Sunucu bağlantısı kurulamadı.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      try {
        const { data, error: rpcError } = await supabase.rpc('get_day_leave_return_photo', {
          p_leave_request_id: leaveRequestId
        });
        if (rpcError) throw rpcError;
        if (active) setRow((((data ?? []) as PhotoRow[])[0] ?? null));
      } catch (reason) {
        if (active) setError(dayLeaveReturnErrorText(reason));
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [leaveRequestId]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const photoUrl = row?.photo_base64 && row.photo_mime_type
    ? `data:${row.photo_mime_type};base64,${row.photo_base64}`
    : '';

  return <div className={styles.backdrop} role="dialog" aria-modal="true" aria-label="Dönüş fotoğrafı">
    <section className={styles.photoSheet}>
      <header className={styles.sheetHead}>
        <div><span>DÖNÜŞ KAYDI</span><h3>{personLabel}</h3></div>
        <button type="button" onClick={onClose} aria-label="Kapat">×</button>
      </header>
      {loading ? <div className={styles.viewerMessage}>Fotoğraf yükleniyor…</div> : null}
      {error ? <div className={styles.error}>{error}</div> : null}
      {!loading && !error && !row ? <div className={styles.viewerMessage}>Dönüş kaydı bulunamadı.</div> : null}
      {!loading && !error && row ? <>
        <div className={styles.returnTime}>Dönüş zamanı: <strong>{formatTurkeyDateTime(row.returned_at)}</strong></div>
        {photoUrl
          ? <img className={styles.returnPhoto} src={photoUrl} alt={`${personLabel} dönüş fotoğrafı`}/>
          : <div className={styles.viewerMessage}>Fotoğrafın 3 günlük saklama süresi dolduğu için silindi.</div>}
      </> : null}
      <div className={styles.viewerActions}><button type="button" className={styles.confirmButton} onClick={onClose}>Kapat</button></div>
    </section>
  </div>;
}
