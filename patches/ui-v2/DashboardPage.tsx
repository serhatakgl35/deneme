import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { formatTrDate, todayIso } from '../lib/date';
import { statusMeta } from '../lib/statusMeta';
import { supabase } from '../lib/supabase';
import { loadStatusSnapshot, type StatusSnapshot } from '../repositories/statusSnapshot';
import type { AttendanceStatus } from '../types/domain';
import styles from './DashboardPage.module.css';

type PendingLeave = { id:string };
type OwnLeave = { status:string };
type LeaveBalance = { annual_allowance:number; road_allowance:number; annual_used:number; road_used:number; annual_remaining:number; road_remaining:number };
type TabldotDebt = { debt_id:string; period_id:string; start_date:string; end_date:string; amount:number; paid_amount:number; remaining:number; total_expense:number; unit_cost:number };
type Tone = 'dark'|'blue'|'green'|'gold'|'rose'|'aqua'|'violet'|'sand';

function errText(error:unknown){return error instanceof Error?error.message:String(error??'İşlem başarısız.');}
function money(value:number|string|null|undefined){return new Intl.NumberFormat('tr-TR',{style:'currency',currency:'TRY',minimumFractionDigits:0,maximumFractionDigits:0}).format(Number(value??0));}
function sumStatuses(counts:Record<string,number>,keys:AttendanceStatus[]){return keys.reduce((sum,key)=>sum+(counts[key]??0),0);}

export function DashboardPage(){
  const { account } = useAuth();
  const isAdmin=account.roles.includes('admin');
  const isCommander=account.roles.includes('commander');
  const isAdministrative=account.roles.includes('administrative');
  const isTeamCommander=account.roles.includes('team_commander');
  const isTabldot=account.roles.includes('tabldot');
  const canApprove=isAdmin||isCommander;
  const showPersonnelOverview=isAdmin||isCommander||isAdministrative||isTeamCommander;
  const canReports=isAdmin||isCommander||isAdministrative||isTabldot;
  const [date]=useState(todayIso());
  const [snapshot,setSnapshot]=useState<StatusSnapshot|null>(null);
  const [pendingLeaves,setPendingLeaves]=useState<PendingLeave[]>([]);
  const [ownLeaves,setOwnLeaves]=useState<OwnLeave[]>([]);
  const [ownBalance,setOwnBalance]=useState<LeaveBalance|null>(null);
  const [tabldotDebts,setTabldotDebts]=useState<TabldotDebt[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');

  const load=useCallback(async()=>{
    if(!supabase)return;
    setLoading(true);
    setError('');
    try{
      const statusPromise=loadStatusSnapshot(date);
      const pendingPromise=canApprove?supabase.from('leave_requests').select('id').eq('status','pending').order('created_at',{ascending:true}):Promise.resolve({data:[],error:null});
      const ownPromise=account.personnelId?supabase.from('leave_requests').select('status').eq('personnel_id',account.personnelId):Promise.resolve({data:[],error:null});
      const balancePromise=account.personnelId?supabase.rpc('get_leave_balance',{p_personnel_id:account.personnelId}):Promise.resolve({data:[],error:null});
      const debtPromise=account.personnelId?supabase.rpc('get_my_tabldot_debts'):Promise.resolve({data:[],error:null});
      const[nextSnapshot,pendingResult,ownResult,balanceResult,debtResult]=await Promise.all([statusPromise,pendingPromise,ownPromise,balancePromise,debtPromise]);
      if(pendingResult.error)throw pendingResult.error;
      if(ownResult.error)throw ownResult.error;
      if(balanceResult.error)throw balanceResult.error;
      if(debtResult.error)throw debtResult.error;
      setSnapshot(nextSnapshot);
      setPendingLeaves((pendingResult.data??[]) as PendingLeave[]);
      setOwnLeaves((ownResult.data??[]) as OwnLeave[]);
      setOwnBalance((((balanceResult.data??[]) as LeaveBalance[])[0]??null));
      setTabldotDebts((debtResult.data??[]) as TabldotDebt[]);
    }catch(err){
      setError(errText(err));
    }finally{
      setLoading(false);
    }
  },[date,canApprove,account.personnelId]);

  useEffect(()=>{void load();},[load]);

  const personnelById=useMemo(()=>new Map((snapshot?.personnel??[]).map(person=>[person.id,person])),[snapshot]);
  const counts=useMemo(()=>{
    const result:Record<string,number>={};
    for(const row of snapshot?.rows??[])result[row.status.status]=(result[row.status.status]??0)+1;
    return result;
  },[snapshot]);
  const ownPerson=account.personnelId?personnelById.get(account.personnelId):undefined;
  const ownStatus=snapshot?.rows.find(row=>row.personnel.id===account.personnelId)?.status;
  const pendingOwn=ownLeaves.filter(row=>row.status==='pending').length;
  const annualRemaining=ownBalance?.annual_remaining??Math.max(0,ownPerson?.annualAllowance??30);
  const roadRemaining=ownBalance?.road_remaining??Math.max(0,ownPerson?.roadAllowance??2);
  const totalTabldotRemaining=tabldotDebts.reduce((sum,row)=>sum+Number(row.remaining??0),0);
  const total=snapshot?.rows.length??0;
  const present=sumStatuses(counts,['present','work','watch','rest']);
  const annual=counts.annual_leave??0;
  const medical=counts.medical??0;
  const outsideDuty=sumStatuses(counts,['duty','temporary_duty','course','referral']);
  const ownDuty = ownPerson?.team?`${ownPerson.team}. Tim${ownPerson.fixedDuty?` · ${ownPerson.fixedDuty}`:''}`:(ownPerson?.fixedDuty??'Tim dışı');
  const ownStatusLabel = ownStatus?statusMeta[ownStatus.status].label:(loading?'Yükleniyor…':'—');
  const personnelDescription = loading?'Personel durumu yükleniyor…':`${present} mevcut · ${annual} izinli · ${medical} raporlu${outsideDuty?` · ${outsideDuty} birlik dışı`:''}`;

  return <div className={styles.stack}>
    {error?<div className={styles.error}>{error}</div>:null}

    {canApprove && pendingLeaves.length>0 ? <Link to="/izin" className={styles.priorityStrip}>
      <span className={styles.priorityIcon}>!</span>
      <div><strong>{pendingLeaves.length} izin talebi onayınızı bekliyor</strong><small>Talepleri incelemek ve işlem yapmak için izin bölümünü açın.</small></div>
      <b>İncele <span>→</span></b>
    </Link> : null}

    <section className={styles.intro}>
      <span className={styles.eyebrow}>ANA SAYFA</span>
      <h2>İşlemler</h2>
      <p>Ana ekranda yalnızca özet var. Ayrıntılar ilgili karta tıklayınca açılır.</p>
    </section>

    <div className={styles.moduleGrid}>
      {showPersonnelOverview?
        <ModuleCard to="/personel" tone="dark" badge={`${total} PERSONEL`} title="Personel Durumu" description={personnelDescription} footer={`${formatTrDate(date)} · Personel listesini aç`}/>:
        <ModuleCard to="/hesabim" tone="dark" badge="BUGÜN" title="Benim Durumum" description={`${ownStatusLabel} · ${ownDuty}`} footer="Kişisel bilgilerini aç"/>}

      <ModuleCard to="/izin" tone="blue" badge={canApprove?`${pendingLeaves.length} BEKLEYEN`:`${pendingOwn} BEKLEYEN`} title="İzin İşlemleri" description={showPersonnelOverview?'İzin talepleri, takvim ve yıllık planlama aynı bölümde.':`Kalan yıllık izin ${annualRemaining} gün · yol izni ${roadRemaining} gün.`} footer="İzin bölümünü aç"/>

      {showPersonnelOverview?
        <ModuleCard to="/yoklama" tone="gold" badge="BUGÜN" title="Çalışma / Vardiya" description="Tim döngüsü, nöbet, nöbet istirahati, mesai ve yoklama işlemleri." footer="Çalışma bölümünü aç"/>:
        <ModuleCard to="/borc-odemeler" tone="gold" badge={totalTabldotRemaining>0?money(totalTabldotRemaining):'BORÇ YOK'} title="Borç / Ödemeler" description="Tabldot borcunuzu, ödemelerinizi ve dekont bildirimlerinizi takip edin." footer="Ödeme bölümünü aç"/>}

      <ModuleCard to="/yemek" tone="green" badge="2 ÖĞÜN" title="Yemek / Tabldot" description="Sabah ve akşam yemek durumu, menü ve tabldot işlemleri." footer="Yemek bölümünü aç"/>

      <ModuleCard to="/faaliyetler" tone="rose" badge="TAKVİM" title="Faaliyetler" description="Haftalık faaliyet takvimi, yaklaşan işler ve duyurular." footer="Faaliyetleri aç"/>
      <ModuleCard to="/camasirhane" tone="aqua" badge="RANDEVU" title="Çamaşırhane" description="Makine durumlarını görün, uygun saate randevu oluşturun." footer="Çamaşırhaneyi aç"/>
      {canReports?<ModuleCard to="/raporlar" tone="violet" badge="RAPOR" title="Raporlar" description="Personel, izin, yoklama ve diğer yönetim raporlarını görüntüleyin." footer="Raporları aç"/>:<ModuleCard to="/duyurular" tone="violet" badge="DUYURU" title="Duyurular" description="Güncel duyuruları ve yaklaşan önemli bilgileri görüntüleyin." footer="Duyuruları aç"/>}
      {isAdmin?<ModuleCard to="/kullanicilar" tone="sand" badge="ADMIN" title="Yönetim" description="Kullanıcılar, yetkiler, tabldot ayarları, veri geçişi ve yedekleme." footer="Yönetimi aç"/>:<ModuleCard to="/hesabim" tone="sand" badge="HESABIM" title="Profilim" description="Kişisel bilgilerinizi ve hesabınıza ait ayarları görüntüleyin." footer="Hesabımı aç"/>}
    </div>
  </div>;
}

function ModuleCard({to,tone,badge,title,description,footer}:{to:string;tone:Tone;badge:string;title:string;description:string;footer:string}){
  return <Link to={to} className={`${styles.moduleCard} ${styles[tone]}`}>
    <span className={styles.decorOne}/><span className={styles.decorTwo}/>
    <div className={styles.moduleTop}><span className={styles.moduleBadge}>{badge}</span><span className={styles.arrow}>→</span></div>
    <h3>{title}</h3><p>{description}</p><span className={styles.moduleFooter}>{footer}</span>
  </Link>;
}
