import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatTrDate } from '../lib/date';
import { supabase } from '../lib/supabase';
import styles from './LeavePage.module.css';
import pageStyles from './ApprovedLeavesPage.module.css';

type LeaveType = 'annual_leave' | 'day_leave' | 'excuse_leave' | 'road_leave' | 'medical' | 'duty' | 'temporary_duty' | 'course' | 'referral' | 'other';
type ApprovedLeaveRow = {
  id:string;
  legacy_id:string|null;
  personnel_id:string;
  personnel_name:string;
  personnel_rank_title:string;
  leave_type:LeaveType;
  start_date:string;
  end_date:string;
  day_count:number;
  city:string|null;
  note:string|null;
  decided_by:string|null;
  decided_by_name:string|null;
  decided_at:string|null;
  created_at:string;
};

const leaveLabels:Record<LeaveType,string> = {
  annual_leave:'Yıllık İzin',
  day_leave:'Günübirlik İzin',
  excuse_leave:'Mazeret İzni',
  road_leave:'Yol İzni',
  medical:'Raporlu / İstirahatli',
  duty:'Görevli',
  temporary_duty:'Geçici Görevli',
  course:'Kurs / Eğitim',
  referral:'Sevkli',
  other:'Diğer'
};
const leaveTypes=Object.keys(leaveLabels) as LeaveType[];

function errText(error:unknown){
  if(error instanceof Error) return error.message;
  if(typeof error==='string') return error;
  return 'Onaylanan izinler yüklenemedi.';
}

function formatDecisionTime(value:string|null){
  if(!value) return '—';
  return new Intl.DateTimeFormat('tr-TR',{
    timeZone:'Europe/Istanbul',
    day:'2-digit',
    month:'2-digit',
    year:'numeric',
    hour:'2-digit',
    minute:'2-digit'
  }).format(new Date(value));
}

function approverLabel(row:ApprovedLeaveRow){
  if(row.decided_by_name) return row.decided_by_name;
  if(row.legacy_id) return 'Eski sistem kaydı';
  if(!row.decided_by) return 'Doğrudan onaylı kayıt';
  return 'Onaylayan bilgisi bulunamadı';
}

export function ApprovedLeavesPage(){
  const [leaves,setLeaves]=useState<ApprovedLeaveRow[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [query,setQuery]=useState('');
  const [typeFilter,setTypeFilter]=useState<LeaveType|''>('');
  const [yearFilter,setYearFilter]=useState('');

  const load=useCallback(async()=>{
    if(!supabase){setLoading(false);return;}
    setLoading(true);setError('');
    try{
      const {data,error:rpcError}=await supabase.rpc('get_approved_leave_records');
      if(rpcError) throw rpcError;
      setLeaves((data??[]) as ApprovedLeaveRow[]);
    }catch(err){setError(errText(err));}
    finally{setLoading(false);}
  },[]);

  useEffect(()=>{void load();},[load]);

  const years=useMemo(()=>Array.from(new Set(leaves.map(row=>row.start_date.slice(0,4)))).sort((a,b)=>b.localeCompare(a)),[leaves]);
  const filtered=useMemo(()=>{
    const needle=query.trim().toLocaleLowerCase('tr-TR');
    return leaves.filter(row=>{
      const hay=`${row.personnel_name} ${row.personnel_rank_title} ${row.city??''} ${row.note??''} ${approverLabel(row)}`.toLocaleLowerCase('tr-TR');
      return (!needle||hay.includes(needle))&&(!typeFilter||row.leave_type===typeFilter)&&(!yearFilter||row.start_date.startsWith(yearFilter));
    });
  },[leaves,query,typeFilter,yearFilter]);
  const summary=useMemo(()=>({
    records:filtered.length,
    personnel:new Set(filtered.map(row=>row.personnel_id)).size,
    days:filtered.reduce((sum,row)=>sum+row.day_count,0)
  }),[filtered]);

  return <div className={`${styles.stack} ${pageStyles.page}`}>
    <div className={styles.pageHead}><div><h2>Onaylanan İzinler</h2><p>Onaylanan izinleri ve işlemi yapan Karakol Komutanını görüntüleyin.</p></div></div>

    <div className={styles.summaryGrid}>
      <div className={styles.summaryCard}><span>Onaylanan izin</span><strong>{loading?'—':summary.records}</strong></div>
      <div className={styles.summaryCard}><span>Personel</span><strong>{loading?'—':summary.personnel}</strong></div>
      <div className={styles.summaryCard}><span>Toplam izin günü</span><strong>{loading?'—':`${summary.days} gün`}</strong></div>
    </div>

    {error?<div className={styles.error}>{error}</div>:null}

    <section className={styles.card}>
      <div className={pageStyles.filters}>
        <label>Arama<input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Personel, rütbe, yer veya onaylayan"/></label>
        <label>İzin türü<select value={typeFilter} onChange={event=>setTypeFilter(event.target.value as LeaveType|'')}><option value="">Tüm türler</option>{leaveTypes.map(type=><option key={type} value={type}>{leaveLabels[type]}</option>)}</select></label>
        <label>Yıl<select value={yearFilter} onChange={event=>setYearFilter(event.target.value)}><option value="">Tüm yıllar</option>{years.map(year=><option key={year} value={year}>{year}</option>)}</select></label>
        <button className={styles.secondary} disabled={loading} onClick={()=>void load()}>Yenile</button>
      </div>

      {loading?<div className={styles.empty}>Onaylanan izinler yükleniyor…</div>:null}
      {!loading&&filtered.length===0?<div className={styles.empty}>Bu filtrede onaylanan izin bulunmuyor.</div>:null}
      {filtered.length>0?<div className={styles.tableWrap}>
        <table className={`${styles.table} ${pageStyles.approvedTable}`}>
          <thead><tr><th>Personel</th><th>Tür</th><th>Tarih</th><th>Gün</th><th>Yer / Açıklama</th><th>Onaylayan</th><th>Onay Tarihi</th></tr></thead>
          <tbody>{filtered.map(row=><tr key={row.id}>
            <td data-label="Personel"><div className={styles.personCell}><strong>{row.personnel_name||'Bilinmeyen personel'}</strong><small>{row.personnel_rank_title||''}</small></div></td>
            <td data-label="İzin türü">{leaveLabels[row.leave_type]}</td>
            <td data-label="Tarih"><span style={{whiteSpace:'nowrap',fontVariantNumeric:'tabular-nums'}}>{formatTrDate(row.start_date)} – {formatTrDate(row.end_date)}</span></td>
            <td data-label="Gün"><strong>{row.day_count}</strong></td>
            <td data-label="Yer / Açıklama">{row.city??'—'}{row.note?<><br/><small>{row.note}</small></>:null}</td>
            <td data-label="Onaylayan"><div className={pageStyles.approver}><strong>{approverLabel(row)}</strong><small>{row.decided_by_name?'Karakol Komutanı / Yetkili':'Onay bilgisi'}</small></div></td>
            <td data-label="Onay tarihi"><span className={pageStyles.decisionTime}>{formatDecisionTime(row.decided_at)}</span></td>
          </tr>)}</tbody>
        </table>
      </div>:null}
    </section>
  </div>;
}
