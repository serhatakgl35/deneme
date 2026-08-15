import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { formatTrDate, todayIso } from '../lib/date';
import { statusMeta } from '../lib/statusMeta';
import { loadStatusSnapshot, type StatusSnapshot } from '../repositories/statusSnapshot';
import type { AttendanceStatus } from '../types/domain';
import styles from './MyTeamTodayPage.module.css';

const workingStatuses = new Set<AttendanceStatus>(['present', 'work', 'watch']);

export function MyTeamTodayPage() {
  const { account } = useAuth();
  const [date] = useState(todayIso());
  const [snapshot, setSnapshot] = useState<StatusSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    loadStatusSnapshot(date)
      .then(data => { if (active) setSnapshot(data); })
      .catch(err => { if (active) setError(err instanceof Error ? err.message : String(err)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [date]);

  const ownPerson = useMemo(
    () => snapshot?.personnel.find(person => person.id === account.personnelId),
    [snapshot, account.personnelId]
  );

  const workingTeam = useMemo(() => {
    if (!snapshot || !ownPerson?.team) return [];
    return snapshot.rows
      .filter(row => row.personnel.team === ownPerson.team && workingStatuses.has(row.status.status))
      .sort((a, b) => a.personnel.name.localeCompare(b.personnel.name, 'tr-TR', { sensitivity: 'base' }));
  }, [snapshot, ownPerson?.team]);

  return <div className={styles.page}>
    <div className={styles.head}>
      <div>
        <span className={styles.eyebrow}>BUGÜNKÜ ÇALIŞMA</span>
        <h2>Timimde Bugün Çalışanlar</h2>
      </div>
      <span className={styles.date}>{formatTrDate(date)}</span>
    </div>

    {error ? <div className={styles.error}>{error}</div> : null}

    {loading ? <div className={styles.empty}>Çalışma durumu yükleniyor…</div> : !ownPerson?.team ?
      <div className={styles.empty}>Size atanmış bir tim bulunmuyor.</div> : <>
        <div className={styles.summary}>
          <div><span>Tim</span><strong>{ownPerson.team}. Tim</strong></div>
          <div><span>Bugün çalışan</span><strong>{workingTeam.length} personel</strong></div>
        </div>

        <div className={styles.list}>
          {workingTeam.length ? workingTeam.map(row => <div className={styles.person} key={row.personnel.id}>
            <div className={styles.avatar}>{row.personnel.name.trim().charAt(0).toLocaleUpperCase('tr-TR')}</div>
            <div className={styles.copy}>
              <strong>{row.personnel.name}</strong>
              <small>{row.personnel.title || `${row.personnel.team}. Tim`}</small>
            </div>
            <span className={styles.status}>{statusMeta[row.status.status].label}</span>
          </div>) : <div className={styles.empty}>Bugün timinizde çalışan personel bulunmuyor.</div>}
        </div>
      </>}
  </div>;
}
