import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { formatTrDate } from '../lib/date';
import { supabase } from '../lib/supabase';
import styles from './LeavePage.module.css';

type LeaveType = 'annual_leave' | 'day_leave' | 'excuse_leave' | 'road_leave' | 'medical' | 'duty' | 'temporary_duty' | 'course' | 'referral' | 'other';
type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
type LeaveRow = {
  id:string;
  leave_type:LeaveType;
  start_date:string;
  end_date:string;
  day_count:number;
  city:string|null;
  note:string|null;
  status:LeaveStatus;
  created_at:string;
};
type LeaveBalance = { annual_remaining:number; road_remaining:number; annual_used:number; road_used:number };

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
const statusLabels:Record<LeaveStatus,string> = {pending:'Onay Bekliyor',approved:'Onaylı',rejected:'Reddedildi',cancelled:'İptal Edildi'};

function errText(error:unknown){
  if(error instanceof Error) return error.message;
  if(typeof error==='string') return error;
  return 'İşlem başarısız.';
}

export function MyLeavesPage(){
  const {account}=useAuth();
  const [leaves,setLeaves]=useState<LeaveRow[]>([]);
  const [balance,setBalance]=useState<LeaveBalance|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');

  const load=useCallback(async()=>{
    if(!supabase||!account.personnelId){setLoading(false);return;}
    setLoading(true); setError('');
    try{
      const [leaveResult,balanceResult]=await Promise.all([
        supabase.from('leave_requests').select('id,leave_type,start_date,end_date,day_count,city,note,status,created_at').eq('personnel_id',account.personnelId).order('start_date',{ascending:false}),
        supabase.rpc('get_leave_balance',{p_personnel_id:account.personnelId})
      ]);
      if(leaveResult.error) throw leaveResult.error;
      if(balanceResult.error) throw balanceResult.error;
      setLeaves((leaveResult.data??[]) as LeaveRow[]);
      setBalance((((balanceResult.data??[]) as LeaveBalance[])[0]??null));
    }catch(err){setError(errText(err));}
    finally{setLoading(false);}
  },[account.personnelId]);

  useEffect(()=>{void load();},[load]);

  const pendingCount=useMemo(()=>leaves.filter(row=>row.status==='pending').length,[leaves]);

  return <div className={styles.stack}>
    <div className={styles.pageHead}><div><h2>Benim İzinlerim</h2></div></div>

    <div className={styles.summaryGrid}>
      <div className={styles.summaryCard}><span>Kalan yıllık izin</span><strong>{loading?'—':`${balance?.annual_remaining??0} gün`}</strong></div>
      <div className={styles.summaryCard}><span>Kalan yol izni</span><strong>{loading?'—':`${balance?.road_remaining??0} gün`}</strong></div>
      <div className={styles.summaryCard}><span>Bekleyen talebim</span><strong>{loading?'—':pendingCount}</strong></div>
    </div>

    {error?<div className={styles.error}>{error}</div>:null}

    <section className={styles.card}>
      <div className={styles.sectionTitle}><h3>İzin Kayıtlarım</h3><button className={styles.secondary} disabled={loading} onClick={()=>void load()}>Yenile</button></div>
      {loading?<div className={styles.empty}>İzin kayıtları yükleniyor…</div>:null}
      {!loading&&leaves.length===0?<div className={styles.empty}>Henüz izin kaydınız yok.</div>:null}
      {leaves.length>0?<div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead><tr><th>Personel</th><th>Tür</th><th>Tarih</th><th>Gün</th><th>Yer / Açıklama</th><th>Durum</th><th>İşlem</th></tr></thead>
          <tbody>{leaves.map(row=><tr key={row.id}>
            <td><div className={styles.personCell}><strong>{account.fullName||'Ben'}</strong><small>{account.rankTitle||''}</small></div></td>
            <td>{leaveLabels[row.leave_type]}</td>
            <td><span style={{whiteSpace:'nowrap',fontVariantNumeric:'tabular-nums'}}>{formatTrDate(row.start_date)} – {formatTrDate(row.end_date)}</span></td>
            <td><strong>{row.day_count}</strong></td>
            <td>{row.city??'—'}{row.note?<><br/><small>{row.note}</small></>:null}</td>
            <td><span className={`${styles.status} ${styles[row.status]}`}>{statusLabels[row.status]}</span></td>
            <td>—</td>
          </tr>)}</tbody>
        </table>
      </div>:null}
    </section>
  </div>;
}
