import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { formatTrDate } from '../lib/date';
import { supabase } from '../lib/supabase';
import styles from './LeavePage.module.css';

type LeaveType = 'annual_leave' | 'day_leave' | 'excuse_leave' | 'road_leave' | 'medical' | 'duty' | 'temporary_duty' | 'course' | 'referral' | 'other';
type PersonnelRow = { id:string; full_name:string; rank_title:string };
type LeaveRow = {
  id:string;
  personnel_id:string;
  leave_type:LeaveType;
  start_date:string;
  end_date:string;
  day_count:number;
  city:string|null;
  note:string|null;
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

function errText(error:unknown){
  if(error instanceof Error) return error.message;
  if(typeof error==='string') return error;
  return 'İşlem başarısız.';
}

export function PendingLeaveApprovalsPage(){
  const { account } = useAuth();
  const canApprove = account.roles.includes('admin') || account.roles.includes('commander');
  const isTeamCommander = account.roles.includes('team_commander') && !canApprove;
  const [personnel,setPersonnel]=useState<PersonnelRow[]>([]);
  const [leaves,setLeaves]=useState<LeaveRow[]>([]);
  const [loading,setLoading]=useState(true);
  const [busyId,setBusyId]=useState('');
  const [message,setMessage]=useState('');
  const [error,setError]=useState('');

  const load=useCallback(async()=>{
    if(!supabase) return;
    setLoading(true); setError('');
    try{
      const [personnelResult,leaveResult]=await Promise.all([
        supabase.from('personnel').select('id,full_name,rank_title').eq('active',true),
        supabase.from('leave_requests').select('id,personnel_id,leave_type,start_date,end_date,day_count,city,note,created_at').eq('status','pending').order('created_at',{ascending:true})
      ]);
      if(personnelResult.error) throw personnelResult.error;
      if(leaveResult.error) throw leaveResult.error;
      setPersonnel(((personnelResult.data??[]) as PersonnelRow[]).sort((a,b)=>a.full_name.localeCompare(b.full_name,'tr-TR',{sensitivity:'base'})));
      setLeaves((leaveResult.data??[]) as LeaveRow[]);
    }catch(err){setError(errText(err));}
    finally{setLoading(false);}
  },[]);

  useEffect(()=>{void load();},[load]);

  const personnelById=useMemo(()=>new Map(personnel.map(person=>[person.id,person])),[personnel]);

  async function decide(row:LeaveRow,decision:'approved'|'rejected'){
    if(!supabase || !canApprove) return;
    setBusyId(row.id); setMessage(''); setError('');
    try{
      const {error:rpcError}=await supabase.rpc('decide_leave_request',{p_request_id:row.id,p_decision:decision});
      if(rpcError) throw rpcError;
      setMessage(decision==='approved'?'İzin talebi onaylandı.':'İzin talebi reddedildi.');
      await load();
    }catch(err){setError(errText(err));}
    finally{setBusyId('');}
  }

  return <div className={styles.stack}>
    <div className={styles.pageHead}><div><h2>{isTeamCommander?'İzin Talepleri':'Onay Bekleyen İzinler'}</h2></div></div>

    <div className={styles.summaryGrid}>
      <div className={styles.summaryCard}><span>Onay bekleyen</span><strong>{loading?'—':leaves.length}</strong></div>
    </div>

    {isTeamCommander?<div className={styles.infoBox}>Bu ekran Tim Komutanları için salt okunurdur. İzin taleplerini görebilirsiniz; onaylama ve reddetme işlemleri yalnızca Karakol Komutanı ve Admin tarafından yapılır.</div>:null}
    {message?<div className={styles.message}>{message}</div>:null}
    {error?<div className={styles.error}>{error}</div>:null}

    <section className={styles.card}>
      <div className={styles.sectionTitle}><h3>Bekleyen Talepler</h3><button className={styles.secondary} disabled={loading} onClick={()=>void load()}>Yenile</button></div>
      {loading?<div className={styles.empty}>İzin talepleri yükleniyor…</div>:null}
      {!loading&&leaves.length===0?<div className={styles.empty}>Onay bekleyen izin talebi yok.</div>:null}
      {leaves.length>0?<div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead><tr><th>Personel</th><th>Tür</th><th>Tarih</th><th>Gün</th><th>Yer / Açıklama</th><th>Durum</th>{canApprove?<th>İşlem</th>:null}</tr></thead>
          <tbody>{leaves.map(row=>{
            const person=personnelById.get(row.personnel_id);
            const busy=busyId===row.id;
            return <tr key={row.id}>
              <td><div className={styles.personCell}><strong>{person?.full_name??'Bilinmeyen personel'}</strong><small>{person?.rank_title??''}</small></div></td>
              <td>{leaveLabels[row.leave_type]}</td>
              <td><span style={{whiteSpace:'nowrap',fontVariantNumeric:'tabular-nums'}}>{formatTrDate(row.start_date)} – {formatTrDate(row.end_date)}</span></td>
              <td><strong>{row.day_count}</strong></td>
              <td>{row.city??'—'}{row.note?<><br/><small>{row.note}</small></>:null}</td>
              <td><span className={`${styles.status} ${styles.pending}`}>Onay Bekliyor</span></td>
              {canApprove?<td><div className={styles.actions}><button className={styles.approve} disabled={Boolean(busyId)} onClick={()=>void decide(row,'approved')}>{busy?'İşleniyor…':'Onayla'}</button><button className={styles.danger} disabled={Boolean(busyId)} onClick={()=>void decide(row,'rejected')}>Reddet</button></div></td>:null}
            </tr>;
          })}</tbody>
        </table>
      </div>:null}
    </section>
  </div>;
}
