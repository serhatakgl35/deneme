import { useCallback, useEffect, useMemo, useState } from 'react';
import { DayLeaveReturnCamera, type CapturedDayLeavePhoto } from '../components/DayLeaveReturnCamera';
import { DayLeaveReturnPhotoModal } from '../components/DayLeaveReturnPhotoModal';
import { useAuth } from '../auth/AuthContext';
import { formatTrDate } from '../lib/date';
import {
  dayLeaveReturnErrorText,
  formatTurkeyDateTime,
  isDayLeaveReturnEligible,
  isDayLeaveReturnPhotoAvailable,
  turkeyTodayIso,
  type DayLeaveReturnMetadata
} from '../lib/dayLeaveReturn';
import { supabase } from '../lib/supabase';
import returnStyles from '../components/DayLeaveReturn.module.css';
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
  const [returns,setReturns]=useState<DayLeaveReturnMetadata[]>([]);
  const [returnFeatureReady,setReturnFeatureReady]=useState(false);
  const [balance,setBalance]=useState<LeaveBalance|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const [cameraLeave,setCameraLeave]=useState<LeaveRow|null>(null);
  const [photoLeaveId,setPhotoLeaveId]=useState<string|null>(null);

  const load=useCallback(async()=>{
    if(!supabase||!account.personnelId){setLoading(false);setReturnFeatureReady(false);return;}
    setLoading(true); setError('');
    try{
      const [leaveResult,balanceResult,returnResult]=await Promise.all([
        supabase.from('leave_requests').select('id,leave_type,start_date,end_date,day_count,city,note,status,created_at').eq('personnel_id',account.personnelId).order('start_date',{ascending:false}),
        supabase.rpc('get_leave_balance',{p_personnel_id:account.personnelId}),
        supabase.from('day_leave_returns').select('leave_request_id,personnel_id,returned_at,photo_expires_at,photo_deleted_at').eq('personnel_id',account.personnelId).order('returned_at',{ascending:false})
      ]);
      if(leaveResult.error) throw leaveResult.error;
      if(balanceResult.error) throw balanceResult.error;
      setLeaves((leaveResult.data??[]) as LeaveRow[]);
      setBalance((((balanceResult.data??[]) as LeaveBalance[])[0]??null));
      if(returnResult.error){
        console.error('Günübirlik dönüş kayıtları yüklenemedi:',returnResult.error);
        setReturns([]);
        setReturnFeatureReady(false);
      }else{
        setReturns((returnResult.data??[]) as DayLeaveReturnMetadata[]);
        setReturnFeatureReady(true);
      }
    }catch(err){setError(errText(err));}
    finally{setLoading(false);}
  },[account.personnelId]);

  useEffect(()=>{void load();},[load]);

  const pendingCount=useMemo(()=>leaves.filter(row=>row.status==='pending').length,[leaves]);
  const returnByLeaveId=useMemo(()=>new Map(returns.map(row=>[row.leave_request_id,row])),[returns]);
  const today=turkeyTodayIso();
  const eligibleLeaves=useMemo(()=>leaves.filter(row=>isDayLeaveReturnEligible(row,returnByLeaveId.get(row.id),today)),[leaves,returnByLeaveId,today]);

  async function submitReturn(photo:CapturedDayLeavePhoto){
    if(!supabase||!cameraLeave) throw new Error('Günübirlik izin kaydı bulunamadı.');
    const {error:rpcError}=await supabase.rpc('submit_day_leave_return',{
      p_leave_request_id:cameraLeave.id,
      p_photo_base64:photo.base64,
      p_photo_mime_type:photo.mimeType
    });
    if(rpcError) throw rpcError;
    setCameraLeave(null);
    setMessage('Dönüşünüz sunucu tarihi ve saatiyle kaydedildi. Fotoğraf 3 gün sonra otomatik silinecek.');
    await load();
  }

  function renderReturnAction(row:LeaveRow){
    if(row.leave_type!=='day_leave') return '—';
    if(!returnFeatureReady) return <span className={returnStyles.mutedStatus}>—</span>;
    const metadata=returnByLeaveId.get(row.id);
    if(metadata){
      const available=isDayLeaveReturnPhotoAvailable(metadata);
      return <div className={returnStyles.returnStatus}>
        <strong>Dönüş bildirildi</strong>
        <small>{formatTurkeyDateTime(metadata.returned_at)}</small>
        {available
          ? <button type="button" className={returnStyles.photoButton} onClick={()=>setPhotoLeaveId(row.id)}>Fotoğrafı Gör</button>
          : <small>Fotoğraf silindi</small>}
      </div>;
    }
    if(isDayLeaveReturnEligible(row,undefined,today)){
      return <button type="button" className={returnStyles.returnButton} onClick={()=>{setMessage('');setCameraLeave(row)}}>Dönüşümü Bildir</button>;
    }
    if(row.status==='approved'&&row.start_date<today) return <span className={returnStyles.mutedStatus}>Dönüş bildirilmedi</span>;
    if(row.status==='approved'&&row.start_date>today) return <span className={returnStyles.mutedStatus}>İzin gününde açılacak</span>;
    return '—';
  }

  return <div className={styles.stack}>
    <div className={styles.pageHead}><div><h2>Benim İzinlerim</h2></div></div>

    <div className={styles.summaryGrid}>
      <div className={styles.summaryCard}><span>Kalan yıllık izin</span><strong>{loading?'—':`${balance?.annual_remaining??0} gün`}</strong></div>
      <div className={styles.summaryCard}><span>Kalan yol izni</span><strong>{loading?'—':`${balance?.road_remaining??0} gün`}</strong></div>
      <div className={styles.summaryCard}><span>Bekleyen talebim</span><strong>{loading?'—':pendingCount}</strong></div>
    </div>

    {error?<div className={styles.error}>{error}</div>:null}
    {message?<div className={styles.success}>{message}</div>:null}

    {returnFeatureReady&&eligibleLeaves.length>0?<section className={`${styles.card} ${returnStyles.returnCard}`}>
      <div className={returnStyles.returnCardContent}>
        <div><h3>Günübirlik İzin Dönüşü</h3><p>Karakola döndüğünüzde canlı kamerayla fotoğraf çekerek dönüşünüzü bildirin.</p></div>
        <button type="button" className={returnStyles.returnButton} onClick={()=>{setMessage('');setCameraLeave(eligibleLeaves[0])}}>Dönüşümü Bildir</button>
      </div>
    </section>:null}

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
            <td>{renderReturnAction(row)}</td>
          </tr>)}</tbody>
        </table>
      </div>:null}
    </section>

    {cameraLeave?<DayLeaveReturnCamera onCancel={()=>setCameraLeave(null)} onSubmit={submitReturn}/>:null}
    {photoLeaveId?<DayLeaveReturnPhotoModal leaveRequestId={photoLeaveId} personLabel={account.fullName||'Dönüş kaydım'} onClose={()=>setPhotoLeaveId(null)}/>:null}
  </div>;
}
