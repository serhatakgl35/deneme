import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { supabase } from '../../lib/supabase';
import styles from './AnnouncementPopup.module.css';

type Announcement = {
  id: string;
  title: string;
  body: string;
  published_at: string;
  expires_at: string | null;
};

function publishedLabel(value: string) {
  return new Intl.DateTimeFormat('tr-TR', {
    timeZone: 'Europe/Istanbul',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

export function AnnouncementPopup() {
  const { user, account } = useAuth();
  const [queue, setQueue] = useState<Announcement[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!supabase || !user || account.approvalStatus !== 'approved' || account.mustChangePassword) {
      setQueue([]);
      return;
    }

    const [announcementResult, readResult] = await Promise.all([
      supabase
        .from('announcements')
        .select('id,title,body,published_at,expires_at')
        .eq('active', true)
        .order('published_at', { ascending: false }),
      supabase
        .from('announcement_reads')
        .select('announcement_id')
        .eq('auth_user_id', user.id)
    ]);

    if (announcementResult.error) throw announcementResult.error;
    if (readResult.error) throw readResult.error;

    const now = Date.now();
    const readIds = new Set((readResult.data ?? []).map(row => String(row.announcement_id)));
    const unread = ((announcementResult.data ?? []) as Announcement[]).filter(item => {
      if (readIds.has(item.id)) return false;
      return !item.expires_at || new Date(item.expires_at).getTime() >= now;
    });
    setQueue(unread);
  }, [user, account.approvalStatus, account.mustChangePassword]);

  useEffect(() => {
    setError('');
    void load().catch(err => setError(err instanceof Error ? err.message : String(err)));
  }, [load]);

  const current = queue[0];
  useEffect(() => {
    if (!current) return;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = oldOverflow; };
  }, [current]);

  async function markRead() {
    if (!supabase || !user || !current || busy) return;
    setBusy(true);
    setError('');
    try {
      const { error: insertError } = await supabase.from('announcement_reads').insert({
        announcement_id: current.id,
        auth_user_id: user.id
      });
      if (insertError && insertError.code !== '23505') throw insertError;
      setQueue(items => items.slice(1));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  if (!current) return null;

  return <div className={styles.overlay}>
    <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="pbys-announcement-title">
      <div className={styles.icon}>!</div>
      <span className={styles.eyebrow}>YENİ DUYURU</span>
      <h2 id="pbys-announcement-title">{current.title}</h2>
      <time>{publishedLabel(current.published_at)}</time>
      <div className={styles.body}>{current.body}</div>
      {error ? <div className={styles.error}>{error}</div> : null}
      <div className={styles.actions}>
        <Link to="/duyurular" className={styles.secondary}>Duyuruları Aç</Link>
        <button type="button" className={styles.primary} disabled={busy} onClick={() => void markRead()}>{busy ? 'Kaydediliyor…' : 'Okudum'}</button>
      </div>
      {queue.length > 1 ? <small className={styles.remaining}>Bundan sonra {queue.length - 1} okunmamış duyuru daha var.</small> : null}
    </section>
  </div>;
}
