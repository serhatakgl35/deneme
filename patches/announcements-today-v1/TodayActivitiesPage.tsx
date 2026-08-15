import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { formatTrDate, todayIso } from '../../lib/date';
import { supabase } from '../../lib/supabase';
import styles from './TodayActivitiesPage.module.css';

type Activity = {
  id: string;
  activity_date: string;
  start_time: string | null;
  end_time: string | null;
  title: string;
  location: string | null;
  note: string | null;
};

function shortTime(value: string | null) { return value ? value.slice(0, 5) : ''; }

export function TodayActivitiesPage() {
  const date = todayIso();
  const [rows, setRows] = useState<Activity[]>([]);
  const [detail, setDetail] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    setError('');
    try {
      const { data, error: queryError } = await supabase
        .from('weekly_activities')
        .select('id,activity_date,start_time,end_time,title,location,note')
        .eq('activity_date', date)
        .order('start_time', { ascending: true, nullsFirst: false });
      if (queryError) throw queryError;
      setRows((data ?? []) as Activity[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!detail) return;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setDetail(null); };
    document.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = oldOverflow; document.removeEventListener('keydown', onKey); };
  }, [detail]);

  const modal = detail ? createPortal(<div className={styles.overlay} role="presentation" onMouseDown={event => { if (event.currentTarget === event.target) setDetail(null); }}>
    <section className={styles.modal} role="dialog" aria-modal="true" aria-label="Faaliyet detayı">
      <div className={styles.modalHead}><div><span>FAALİYET DETAYI</span><h3>{detail.title}</h3></div><button type="button" onClick={() => setDetail(null)}>×</button></div>
      <div className={styles.modalBody}>
        <div><span>Tarih</span><strong>{formatTrDate(detail.activity_date)}</strong></div>
        <div><span>Saat</span><strong>{detail.start_time ? `${shortTime(detail.start_time)}${detail.end_time ? ` – ${shortTime(detail.end_time)}` : ''}` : 'Saat belirtilmedi'}</strong></div>
        <div><span>Konum</span><strong>{detail.location || 'Belirtilmedi'}</strong></div>
        <div className={styles.note}><span>Not / Açıklama</span><p>{detail.note || 'Açıklama bulunmuyor.'}</p></div>
      </div>
    </section>
  </div>, document.body) : null;

  return <div className={styles.page}>
    <div className={styles.head}>
      <div><span className={styles.eyebrow}>GÜNLÜK PROGRAM</span><h2>Bugünün Faaliyetleri</h2><p>{formatTrDate(date)} tarihinde planlanan faaliyetler.</p></div>
      <Link to="/faaliyetler" className={styles.weekLink}>Haftalık Takvimi Aç</Link>
    </div>

    <div className={styles.summary}><span>Bugün</span><strong>{loading ? '—' : `${rows.length} faaliyet`}</strong></div>
    {error ? <div className={styles.error}>{error}</div> : null}

    <div className={styles.list}>
      {loading ? <div className={styles.empty}>Faaliyetler yükleniyor…</div> : rows.length ? rows.map(row => <button key={row.id} type="button" className={styles.activity} onClick={() => setDetail(row)}>
        <span className={styles.time}>{row.start_time ? `${shortTime(row.start_time)}${row.end_time ? ` – ${shortTime(row.end_time)}` : ''}` : 'Saat belirtilmedi'}</span>
        <div><strong>{row.title}</strong><small>{row.location || 'Konum belirtilmedi'}</small></div>
        <b>→</b>
      </button>) : <div className={styles.empty}>Bugün için kayıtlı faaliyet bulunmuyor.</div>}
    </div>
    {modal}
  </div>;
}
