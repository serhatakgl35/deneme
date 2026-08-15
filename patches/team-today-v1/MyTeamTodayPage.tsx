import { useEffect, useState } from 'react';
import { formatTrDate, todayIso } from '../lib/date';
import { statusMeta } from '../lib/statusMeta';
import { supabase } from '../lib/supabase';
import type { AttendanceStatus } from '../types/domain';
import styles from './MyTeamTodayPage.module.css';

type TeamTodayRow = {
  personnel_id: string;
  full_name: string;
  rank_title: string | null;
  team_code: string;
  effective_status: AttendanceStatus;
};

export function MyTeamTodayPage() {
  const [date] = useState(todayIso());
  const [rows, setRows] = useState<TeamTodayRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function load() {
      if (!supabase) {
        if (active) {
          setError('Supabase bağlantısı yapılandırılmamış.');
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError('');
      const result = await supabase.rpc('get_my_team_today', { p_date: date });

      if (!active) return;
      if (result.error) {
        setError(result.error.message);
        setRows([]);
      } else {
        setRows((result.data ?? []) as TeamTodayRow[]);
      }
      setLoading(false);
    }

    void load();
    return () => { active = false; };
  }, [date]);

  const teamCode = rows[0]?.team_code ?? '';

  return <div className={styles.page}>
    <div className={styles.head}>
      <div>
        <span className={styles.eyebrow}>BUGÜNKÜ ÇALIŞMA</span>
        <h2>Timimde Bugün Çalışanlar</h2>
      </div>
      <span className={styles.date}>{formatTrDate(date)}</span>
    </div>

    {error ? <div className={styles.error}>{error}</div> : null}

    {loading ? <div className={styles.empty}>Çalışma durumu yükleniyor…</div> : !error ? <>
      <div className={styles.summary}>
        <div><span>Tim</span><strong>{teamCode ? `${teamCode}. Tim` : '—'}</strong></div>
        <div><span>Bugün çalışan</span><strong>{rows.length} personel</strong></div>
      </div>

      <div className={styles.list}>
        {rows.length ? rows.map(row => <div className={styles.person} key={row.personnel_id}>
          <div className={styles.avatar}>{row.full_name.trim().charAt(0).toLocaleUpperCase('tr-TR')}</div>
          <div className={styles.copy}>
            <strong>{row.full_name}</strong>
            <small>{row.rank_title || `${row.team_code}. Tim`}</small>
          </div>
          <span className={styles.status}>{statusMeta[row.effective_status]?.label ?? row.effective_status}</span>
        </div>) : <div className={styles.empty}>Bugün timinizde çalışan personel bulunmuyor.</div>}
      </div>
    </> : null}
  </div>;
}
