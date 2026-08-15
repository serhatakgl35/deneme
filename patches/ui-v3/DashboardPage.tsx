import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
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
type HubIconName = 'users'|'shift'|'check'|'leave'|'calendar'|'history'|'menu'|'meal'|'wallet'|'payment'|'bell'|'activity'|'laundry'|'report'|'profile'|'settings'|'scope'|'swap'|'backup';

function errText(error:unknown){return error instanceof Error?error.message:String(error??'İşlem başarısız.');}
function money(value:number|string|null|undefined){return new Intl.NumberFormat('tr-TR',{style:'currency',currency:'TRY',minimumFractionDigits:0,maximumFractionDigits:0}).format(Number(value??0));}
function sumStatuses(counts:Record<string,number>,keys:AttendanceStatus[]){return keys.reduce((sum,key)=>sum+(counts[key]??0),0);}

function HubIcon({name}:{name:HubIconName}){
  let shape:ReactNode;
  switch(name){
    case 'users': shape=<><circle cx="9" cy="8" r="3"/><path d="M3.5 20c.5-3.7 2.6-6 5.5-6s5 2.3 5.5 6"/><circle cx="17" cy="9" r="2.3"/><path d="M15.4 15.2c2.8-.5 4.8 1.4 5.1 4.3"/></>;break;
    case 'shift': shape=<><path d="M12 3 19 6v5c0 4.7-2.8 8-7 10-4.2-2-7-5.3-7-10V6l7-3Z"/><path d="m9 12 2 2 4-5"/></>;break;
    case 'check': shape=<><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2.8h6V4M8 10h8M8 14h5M8 18h4"/></>;break;
    case 'leave': shape=<><rect x="3.5" y="5" width="17" height="16" rx="2"/><path d="M7 3v4M17 3v4M3.5 9h17M8 13h3M13 13h3M8 17h3"/></>;break;
    case 'calendar': shape=<><rect x="3.5" y="5" width="17" height="16" rx="2"/><path d="M7 3v4M17 3v4M3.5 9h17"/><circle cx="8" cy="13" r=".8" fill="currentColor" stroke="none"/><circle cx="12" cy="13" r=".8" fill="currentColor" stroke="none"/><circle cx="16" cy="13" r=".8" fill="currentColor" stroke="none"/><circle cx="8" cy="17" r=".8" fill="currentColor" stroke="none"/><circle cx="12" cy="17" r=".8" fill="currentColor" stroke="none"/></>;break;
    case 'history': shape=<><path d="M4 8V4m0 0h4M4.8 5.2A8.5 8.5 0 1 1 3.5 15"/><path d="M12 7v5l3 2"/></>;break;
    case 'menu': shape=<><path d="M4 15h16M6 15a6 6 0 0 1 12 0M12 7V5M5 19h14"/></>;break;
    case 'meal': shape=<><path d="M6 3v7M3.8 3v5.5A2.2 2.2 0 0 0 6 10.7a2.2 2.2 0 0 0 2.2-2.2V3M6 10.7V21M16 3v18M16 3c3 1.8 4.2 5 3.2 8H16"/></>;break;
    case 'wallet': shape=<><path d="M4 6.5h13.5A2.5 2.5 0 0 1 20 9v9a2.5 2.5 0 0 1-2.5 2H5a2 2 0 0 1-2-2V6.5a2.5 2.5 0 0 1 2.5-2H17"/><path d="M15 12h5v4h-5a2 2 0 1 1 0-4Z"/></>;break;
    case 'payment': shape=<><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h4"/></>;break;
    case 'bell': shape=<><path d="M6 9a6 6 0 0 1 12 0c0 7 3 7 3 7H3s3 0 3-7"/><path d="M10 20h4"/></>;break;
    case 'activity': shape=<><path d="M3.5 6.5h6l2 2h9v10.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V6.5Z"/><path d="M3.5 10h17"/></>;break;
    case 'laundry': shape=<><rect x="4" y="3" width="16" height="18" rx="2"/><circle cx="12" cy="13" r="5"/><path d="M7 6h2M12 6h1"/></>;break;
    case 'report': shape=<><path d="M4 20V4M4 20h16"/><path d="M8 17v-5M12 17V8M16 17v-8M20 17V6"/></>;break;
    case 'profile': shape=<><circle cx="12" cy="8" r="4"/><path d="M4.5 21c.7-4.6 3.3-7 7.5-7s6.8 2.4 7.5 7"/></>;break;
    case 'settings': shape=<><circle cx="12" cy="12" r="3"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"/><circle cx="12" cy="12" r="7"/></>;break;
    case 'scope': shape=<><circle cx="12" cy="12" r="8"/><path d="M12 8v8M8 12h8"/></>;break;
    case 'swap': shape=<><path d="M4 7h13l-3-3M20 17H7l3 3"/><path d="m17 7-3 3M7 17l3-3"/></>;break;
    case 'backup': shape=<><ellipse cx="12" cy="5.5" rx="7" ry="3"/><path d="M5 5.5v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6M5 11.5v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/></>;break;
  }
  return <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{shape}</svg>;
}

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
  const canLeaveHistory=isAdmin||isAdministrative;
  const canLeaveCalendar=isAdmin||isCommander||isAdministrative||isTeamCommander;
  const [date]=useState(todayIso());
  const [snapshot,setSnapshot]=useState<StatusSnapshot|null>(null);
  const [pendingLeaves,setPendingLeaves]=useState<PendingLeave[]>([]);
  const [ownLeaves,setOwnLeaves]=useState<OwnLeave[]>([]);
  const [ownBalance,setOwnBalance]=useState<LeaveBalance|null>(null);
  const [tabldotDebts,setTabldotDebts]=useState<TabldotDebt[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');

  const load=useCallback(async()=>{
    if(!supabase){setLoading(false);return;}
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
    }catch(err){setError(errText(err));}
    finally{setLoading(false);}
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
  const ownDuty=ownPerson?.team?`${ownPerson.team}. Tim${ownPerson.fixedDuty?` · ${ownPerson.fixedDuty}`:''}`:(ownPerson?.fixedDuty??'Tim dışı');
  const ownStatusLabel=ownStatus?statusMeta[ownStatus.status].label:(loading?'Yükleniyor…':'—');
  const personnelDetail=loading?'Durumlar yükleniyor…':`${present} mevcut · ${annual} izinli · ${medical} raporlu${outsideDuty?` · ${outsideDuty} birlik dışı`:''}`;

  return <div className={styles.stack}>
    {error?<div className={styles.error}>{error}</div>:null}

    {canApprove&&pendingLeaves.length>0?<Link to="/izin" className={styles.priorityStrip}>
      <span className={styles.priorityDot}/>
      <div><strong>{pendingLeaves.length} izin talebi onayınızı bekliyor</strong><small>İzin işlemlerini açıp talepleri inceleyin.</small></div>
      <span className={styles.priorityAction}>İncele →</span>
    </Link>:null}

    <section className={styles.overview}>
      <div className={styles.overviewHead}>
        <div><span className={styles.eyebrow}>BUGÜNÜN ÖZETİ</span><h2>PBYS tek ekranda</h2></div>
        <span className={styles.datePill}>{formatTrDate(date)}</span>
      </div>
      <div className={styles.summaryGrid}>
        {showPersonnelOverview?
          <SummaryCard label="Personel" value={loading?'—':String(total)} detail={personnelDetail} emphasis/>:
          <SummaryCard label="Bugünkü durumum" value={ownStatusLabel} detail={ownDuty} emphasis/>}
        <SummaryCard label="İzin" value={canApprove?`${pendingLeaves.length} bekleyen`:`${annualRemaining} gün`} detail={canApprove?'Onay bekleyen talepler':`${pendingOwn} talep bekliyor · ${roadRemaining} gün yol`}/>
        <SummaryCard label="Çalışma" value={showPersonnelOverview?'Vardiya & Yoklama':ownDuty} detail={showPersonnelOverview?'Tim, nöbet, istirahat ve mesai':'Tim ve sabit görev bilgisi'}/>
        <SummaryCard label="Yemek / Tabldot" value={!showPersonnelOverview&&totalTabldotRemaining>0?money(totalTabldotRemaining):'Sabah + Akşam'} detail={!showPersonnelOverview&&totalTabldotRemaining>0?'Kalan tabldot borcu':'Günlük iki öğün takibi'}/>
      </div>
    </section>

    <section className={styles.hub}>
      <div className={styles.hubHead}>
        <div><span className={styles.eyebrow}>TÜM BÖLÜMLER</span><h2>İşlem Merkezi</h2><p>Tüm başlıklar burada toplandı. Yapacağınız işlemi seçin; ayrıntı kendi sayfasında açılsın.</p></div>
      </div>

      <div className={styles.groupGrid}>
        <section className={styles.group}>
          <GroupTitle icon={showPersonnelOverview?'users':'profile'} title={showPersonnelOverview?'Personel & Çalışma':'Kişisel İşlemler'} text={showPersonnelOverview?'Personel, tim ve günlük çalışma düzeni':'Size ait temel işlemler'}/>
          <div className={styles.linkList}>
            {showPersonnelOverview?<>
              <HubLink to="/personel" icon="users" title="Personel Listesi" detail="Tüm aktif personel ve bugünkü durum" meta={loading?'':`${total} kişi`}/>
              <HubLink to="/tim-vardiya" icon="shift" title="Tim / Vardiya" detail="Nöbet · istirahat · mesai döngüsü"/>
              <HubLink to="/yoklama" icon="check" title="Yoklama" detail="Günlük yoklama girişi ve özeti"/>
            </>:<>
              <HubLink to="/hesabim" icon="profile" title="Hesabım" detail="Kişisel bilgilerim ve hesap ayarlarım"/>
              <HubLink to="/camasirhane" icon="laundry" title="Çamaşırhane" detail="Makine durumu ve randevu"/>
            </>}
          </div>
        </section>

        <section className={styles.group}>
          <GroupTitle icon="leave" title="İzin & Planlama" text="Talep, takvim, geçmiş ve yıllık plan"/>
          <div className={styles.linkList}>
            <HubLink to="/izin" icon="leave" title="İzin İşlemleri" detail="Yeni talep ve onay süreci" meta={canApprove&&pendingLeaves.length?`${pendingLeaves.length} bekleyen`:undefined}/>
            {canLeaveHistory?<HubLink to="/izin-gecmisi" icon="history" title="İzin / Rapor Geçmişi" detail="Geçmiş izin ve sağlık kayıtları"/>:null}
            {canLeaveCalendar?<HubLink to="/izin-takvimi" icon="calendar" title="İzin Takvimi" detail="Tüm izinleri takvim üzerinde görüntüle"/>:null}
            <HubLink to="/izin-planlama" icon="calendar" title="Yıllık İzin Planlama" detail="Tercihler ve yıllık planlama süreci"/>
          </div>
        </section>

        <section className={styles.group}>
          <GroupTitle icon="meal" title="Yemek & Günlük" text="Yemek, ödeme ve günlük kullanım"/>
          <div className={styles.linkList}>
            <HubLink to="/gunluk-menu" icon="menu" title="Günlük Menü" detail="Sabah ve akşam menüsü"/>
            <HubLink to="/yemek" icon="meal" title="Yemek Durumu" detail="Yiyecek kişi sayıları ve tercihler"/>
            <HubLink to="/borc-odemeler" icon="wallet" title="Borç / Ödemeler" detail="Tabldot borcu ve ödeme geçmişi" meta={totalTabldotRemaining>0?money(totalTabldotRemaining):undefined}/>
            {(isAdmin||isTabldot)?<HubLink to="/tabldot-odemeler" icon="payment" title="Ödeme Onayları" detail="Bildirim ve dekont onayları"/>:null}
            {showPersonnelOverview?<HubLink to="/camasirhane" icon="laundry" title="Çamaşırhane" detail="Makine durumu, randevu ve arıza"/>:null}
          </div>
        </section>

        <section className={styles.group}>
          <GroupTitle icon={isAdmin?'settings':'activity'} title={isAdmin?'Faaliyet, Rapor & Yönetim':'Faaliyet & Diğer'} text={isAdmin?'Takip ve sistem yönetimi':'Duyurular, faaliyetler ve hesabınız'}/>
          <div className={styles.linkList}>
            <HubLink to="/duyurular" icon="bell" title="Duyurular / Yaklaşanlar" detail="Güncel duyurular ve önemli tarihler"/>
            <HubLink to="/faaliyetler" icon="activity" title="Haftalık Faaliyet Takvimi" detail="Haftalık işler ve faaliyet planı"/>
            {canReports?<HubLink to="/raporlar" icon="report" title="Raporlar" detail="Personel, izin, yoklama ve diğer raporlar"/>:null}
            {isAdmin?<>
              <HubLink to="/kullanicilar" icon="settings" title="Kullanıcı Yönetimi" detail="Kullanıcılar, roller ve yetkiler"/>
              <HubLink to="/tabldot-ayarlari" icon="scope" title="Tabldot Kapsam Ayarları" detail="Tabldot kapsamı ve sistem ayarları"/>
              <HubLink to="/veri-gecisi" icon="swap" title="Veri Geçişi" detail="Eski verilerin aktarım araçları"/>
              <HubLink to="/yedekleme" icon="backup" title="Yedekleme" detail="Veri yedekleme ve geri yükleme"/>
            </>:<HubLink to="/hesabim" icon="profile" title="Hesabım" detail="Kişisel bilgiler ve hesap ayarları"/>}
          </div>
        </section>
      </div>
    </section>
  </div>;
}

function SummaryCard({label,value,detail,emphasis=false}:{label:string;value:string;detail:string;emphasis?:boolean}){
  return <div className={`${styles.summaryCard} ${emphasis?styles.summaryEmphasis:''}`}><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>;
}

function GroupTitle({icon,title,text}:{icon:HubIconName;title:string;text:string}){
  return <div className={styles.groupTitle}><span className={styles.groupIcon}><HubIcon name={icon}/></span><div><h3>{title}</h3><p>{text}</p></div></div>;
}

function HubLink({to,icon,title,detail,meta}:{to:string;icon:HubIconName;title:string;detail:string;meta?:string}){
  return <Link to={to} className={styles.hubLink}>
    <span className={styles.linkIcon}><HubIcon name={icon}/></span>
    <span className={styles.linkCopy}><strong>{title}</strong><small>{detail}</small></span>
    {meta?<span className={styles.meta}>{meta}</span>:null}
    <span className={styles.linkArrow}>→</span>
  </Link>;
}
