import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dashboardPath = path.join(root, 'src/pages/DashboardPage.tsx');
const cssPath = path.join(root, 'src/pages/DashboardPage.module.css');

let source = fs.readFileSync(dashboardPath, 'utf8');
let css = fs.readFileSync(cssPath, 'utf8');

function replaceOnce(label, from, to) {
  if (!source.includes(from)) throw new Error(`Dashboard v4 yaması uygulanamadı: ${label}`);
  source = source.replace(from, to);
}

replaceOnce('types',
`type TabldotDebt = { debt_id:string; period_id:string; start_date:string; end_date:string; amount:number; paid_amount:number; remaining:number; total_expense:number; unit_cost:number };`,
`type TabldotDebt = { debt_id:string; period_id:string; start_date:string; end_date:string; amount:number; paid_amount:number; remaining:number; total_expense:number; unit_cost:number };
type MenuRow = { menu_date:string; breakfast:string|null; dinner:string|null };
type MealSelection = { meal:'breakfast'|'dinner'; selection:'yes'|'no'|'reserve' };`);

replaceOnce('states',
`  const [tabldotDebts,setTabldotDebts]=useState<TabldotDebt[]>([]);
  const [loading,setLoading]=useState(true);`,
`  const [tabldotDebts,setTabldotDebts]=useState<TabldotDebt[]>([]);
  const [menu,setMenu]=useState<MenuRow|null>(null);
  const [mealSelections,setMealSelections]=useState<MealSelection[]>([]);
  const [loading,setLoading]=useState(true);`);

replaceOnce('load promises',
`      const debtPromise=account.personnelId?supabase.rpc('get_my_tabldot_debts'):Promise.resolve({data:[],error:null});
      const[nextSnapshot,pendingResult,ownResult,balanceResult,debtResult]=await Promise.all([statusPromise,pendingPromise,ownPromise,balancePromise,debtPromise]);
      if(pendingResult.error)throw pendingResult.error;
      if(ownResult.error)throw ownResult.error;
      if(balanceResult.error)throw balanceResult.error;
      if(debtResult.error)throw debtResult.error;`,
`      const debtPromise=account.personnelId?supabase.rpc('get_my_tabldot_debts'):Promise.resolve({data:[],error:null});
      const menuPromise=canApprove?supabase.from('daily_menus').select('menu_date,breakfast,dinner').eq('menu_date',date).maybeSingle():Promise.resolve({data:null,error:null});
      const mealPromise=canApprove&&account.personnelId?supabase.from('meal_selections').select('meal,selection').eq('personnel_id',account.personnelId).eq('meal_date',date):Promise.resolve({data:[],error:null});
      const[nextSnapshot,pendingResult,ownResult,balanceResult,debtResult,menuResult,mealResult]=await Promise.all([statusPromise,pendingPromise,ownPromise,balancePromise,debtPromise,menuPromise,mealPromise]);
      if(pendingResult.error)throw pendingResult.error;
      if(ownResult.error)throw ownResult.error;
      if(balanceResult.error)throw balanceResult.error;
      if(debtResult.error)throw debtResult.error;
      if(menuResult.error)throw menuResult.error;
      if(mealResult.error)throw mealResult.error;`);

replaceOnce('load state set',
`      setOwnBalance((((balanceResult.data??[]) as LeaveBalance[])[0]??null));
      setTabldotDebts((debtResult.data??[]) as TabldotDebt[]);`,
`      setOwnBalance((((balanceResult.data??[]) as LeaveBalance[])[0]??null));
      setTabldotDebts((debtResult.data??[]) as TabldotDebt[]);
      setMenu((menuResult.data??null) as MenuRow|null);
      setMealSelections((mealResult.data??[]) as MealSelection[]);`);

replaceOnce('summary values',
`  const present=sumStatuses(counts,['present','work','watch','rest']);
  const annual=counts.annual_leave??0;
  const medical=counts.medical??0;
  const outsideDuty=sumStatuses(counts,['duty','temporary_duty','course','referral']);`,
`  const present=sumStatuses(counts,['present','work','watch','rest']);
  const annual=counts.annual_leave??0;
  const dayLeave=counts.day_leave??0;
  const medical=counts.medical??0;
  const leaveTotal=sumStatuses(counts,['annual_leave','excuse_leave','road_leave']);
  const ready=sumStatuses(counts,['present','work','watch']);
  const outsideDuty=sumStatuses(counts,['duty','temporary_duty','course','referral']);`);

replaceOnce('summary helpers',
`  const personnelDetail=loading?'Durumlar yükleniyor…':\`${'${present}'} mevcut · ${'${annual}'} izinli · ${'${medical}'} raporlu${'${outsideDuty?` · ${outsideDuty} birlik dışı`:\'\'}'}\`;`,
`  const personnelDetail=loading?'Durumlar yükleniyor…':\`${'${present}'} mevcut · ${'${annual}'} izinli · ${'${medical}'} raporlu${'${outsideDuty?` · ${outsideDuty} birlik dışı`:\'\'}'}\`;
  const mealPreference=(meal:'breakfast'|'dinner')=>{const selection=mealSelections.find(row=>row.meal===meal)?.selection??'yes';return selection==='no'?'Yemeyeceğim':selection==='reserve'?'Ayır':'Yiyeceğim';};`);

replaceOnce('summary grid',
`      <div className={styles.summaryGrid}>
        {showPersonnelOverview?
          <SummaryCard label="Personel" value={loading?'—':String(total)} detail={personnelDetail} emphasis/>:
          <SummaryCard label="Bugünkü durumum" value={ownStatusLabel} detail={ownDuty} emphasis/>}
        <SummaryCard label="İzin" value={canApprove?\`${'${pendingLeaves.length}'} bekleyen\`:\`${'${annualRemaining}'} gün\`} detail={canApprove?'Onay bekleyen talepler':\`${'${pendingOwn}'} talep bekliyor · ${'${roadRemaining}'} gün yol\`}/>
        <SummaryCard label="Çalışma" value={showPersonnelOverview?'Vardiya & Yoklama':ownDuty} detail={showPersonnelOverview?'Tim, nöbet, istirahat ve mesai':'Tim ve sabit görev bilgisi'}/>
        <SummaryCard label="Yemek / Tabldot" value={!showPersonnelOverview&&totalTabldotRemaining>0?money(totalTabldotRemaining):'Sabah + Akşam'} detail={!showPersonnelOverview&&totalTabldotRemaining>0?'Kalan tabldot borcu':'Günlük iki öğün takibi'}/>
      </div>`,
`      {canApprove?<div className={\`${'${styles.summaryGrid}'} ${'${styles.managerSummaryGrid}'}\`}>
        <Link to="/personel" className={\`${'${styles.summaryCard}'} ${'${styles.summaryLink}'} ${'${styles.summaryEmphasis}'} ${'${styles.personnelSummaryCard}'}\`}>
          <span>Personel</span>
          <strong>{loading?'—':\`${'${total}'} kişi\`}</strong>
          <div className={styles.statusMiniGrid}>
            <MiniStat label="Mevcut" value={present}/>
            <MiniStat label="İzinli" value={leaveTotal}/>
            <MiniStat label="Raporlu" value={medical}/>
            <MiniStat label="Günübirlik" value={dayLeave}/>
            <MiniStat label="Hazır" value={ready}/>
          </div>
          <small>Personel listesini ve bugünkü ayrıntıları aç →</small>
        </Link>

        <Link to="/izin" className={\`${'${styles.summaryCard}'} ${'${styles.summaryLink}'} ${'${pendingLeaves.length?styles.leaveAlertCard:\'\'}'}\`}>
          <span>Bekleyen İzin</span>
          <strong>{pendingLeaves.length}</strong>
          <small>{pendingLeaves.length?'Onay bekleyen izin taleplerini incele':'Bekleyen izin talebi yok'}</small>
          <em className={styles.cardAction}>İzin işlemlerini aç →</em>
        </Link>

        <Link to="/yemek" className={\`${'${styles.summaryCard}'} ${'${styles.summaryLink}'} ${'${styles.mealSummaryCard}'}\`}>
          <span>Yemek Menüsü & Tercihim</span>
          <div className={styles.mealOverviewGrid}>
            <div><b>Sabah</b><strong>{menu?.breakfast||'Menü girilmedi'}</strong><em>{mealPreference('breakfast')}</em></div>
            <div><b>Akşam</b><strong>{menu?.dinner||'Menü girilmedi'}</strong><em>{mealPreference('dinner')}</em></div>
          </div>
          <small>Menüyü görüntüle veya yemek tercihini değiştir →</small>
        </Link>
      </div>:<div className={styles.summaryGrid}>
        {showPersonnelOverview?
          <SummaryCard to="/personel" label="Personel" value={loading?'—':String(total)} detail={personnelDetail} emphasis/>:
          <SummaryCard to="/hesabim" label="Bugünkü durumum" value={ownStatusLabel} detail={ownDuty} emphasis/>}
        <SummaryCard to="/izin" label="İzin" value={\`${'${annualRemaining}'} gün\`} detail={\`${'${pendingOwn}'} talep bekliyor · ${'${roadRemaining}'} gün yol\`}/>
        <SummaryCard to={showPersonnelOverview?'/yoklama':'/hesabim'} label="Çalışma" value={showPersonnelOverview?'Vardiya & Yoklama':ownDuty} detail={showPersonnelOverview?'Tim, nöbet, istirahat ve mesai':'Tim ve sabit görev bilgisi'}/>
        <SummaryCard to="/yemek" label="Yemek / Tabldot" value={!showPersonnelOverview&&totalTabldotRemaining>0?money(totalTabldotRemaining):'Sabah + Akşam'} detail={!showPersonnelOverview&&totalTabldotRemaining>0?'Kalan tabldot borcu':'Günlük iki öğün takibi'}/>
      </div>}`);

replaceOnce('summary component',
`function SummaryCard({label,value,detail,emphasis=false}:{label:string;value:string;detail:string;emphasis?:boolean}){
  return <div className={\`${'${styles.summaryCard}'} ${'${emphasis?styles.summaryEmphasis:\'\'}'}\`}><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>;
}`,
`function SummaryCard({to,label,value,detail,emphasis=false}:{to:string;label:string;value:string;detail:string;emphasis?:boolean}){
  return <Link to={to} className={\`${'${styles.summaryCard}'} ${'${styles.summaryLink}'} ${'${emphasis?styles.summaryEmphasis:\'\'}'}\`}><span>{label}</span><strong>{value}</strong><small>{detail}</small><em className={styles.cardAction}>Aç →</em></Link>;
}

function MiniStat({label,value}:{label:string;value:number}){
  return <span className={styles.miniStat}><b>{value}</b><small>{label}</small></span>;
}`);

const cssPatch = `
/* manager dashboard v4 */
.summaryLink{text-decoration:none;color:inherit;cursor:pointer;position:relative;transition:transform .16s ease,border-color .16s ease,box-shadow .16s ease}.summaryLink:hover{transform:translateY(-2px);border-color:#c8dad6;box-shadow:0 12px 28px rgba(24,55,56,.08)}.summaryLink:focus-visible{outline:3px solid rgba(22,140,125,.2);outline-offset:2px}.cardAction{margin-top:auto;padding-top:10px;font-size:8.5px;font-style:normal;font-weight:900;color:#147f72}.summaryEmphasis .cardAction{color:#b8ddd7}.managerSummaryGrid{grid-template-columns:1.35fr .72fr 1.45fr}.personnelSummaryCard{min-height:150px}.statusMiniGrid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px;margin:13px 0 4px}.miniStat{display:flex!important;flex-direction:column;gap:2px;padding:8px 7px;border:1px solid rgba(255,255,255,.12);border-radius:11px;background:rgba(255,255,255,.07);text-transform:none!important;letter-spacing:0!important}.miniStat b{font-size:15px;color:#fff;line-height:1}.miniStat small{font-size:7.4px;color:#b9d4cf;padding:0;margin:0}.leaveAlertCard{background:#fffaf0;border-color:#ead6ad}.leaveAlertCard>strong{color:#9b6317}.mealSummaryCard{min-height:150px}.mealOverviewGrid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.mealOverviewGrid>div{min-width:0;border:1px solid #e3eae8;background:#fbfdfc;border-radius:12px;padding:9px}.mealOverviewGrid b,.mealOverviewGrid strong,.mealOverviewGrid em{display:block}.mealOverviewGrid b{font-size:8px;color:#6e8083;text-transform:uppercase;letter-spacing:.4px}.mealOverviewGrid strong{margin-top:4px;font-size:9.2px;line-height:1.35;color:#26383c;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.mealOverviewGrid em{margin-top:7px;width:max-content;max-width:100%;font-size:8px;font-style:normal;font-weight:900;color:#0e7c71;background:#e8f6f3;border-radius:999px;padding:4px 7px}.mealSummaryCard>small{padding-top:10px}
@media(max-width:1120px){.managerSummaryGrid{grid-template-columns:1fr 1fr}.mealSummaryCard{grid-column:1/-1}}
@media(max-width:720px){.managerSummaryGrid{grid-template-columns:1fr}.mealSummaryCard{grid-column:auto}.statusMiniGrid{grid-template-columns:repeat(5,minmax(52px,1fr));overflow-x:auto;padding-bottom:2px}.miniStat{min-width:52px}.mealOverviewGrid{grid-template-columns:1fr 1fr}.personnelSummaryCard,.mealSummaryCard{min-height:0}}
@media(max-width:430px){.mealOverviewGrid{grid-template-columns:1fr}.statusMiniGrid{grid-template-columns:repeat(5,58px)}}
`;

if (!css.includes('/* manager dashboard v4 */')) css += cssPatch;

fs.writeFileSync(dashboardPath, source);
fs.writeFileSync(cssPath, css);
console.log('PBYS yönetici ana sayfa özeti v4 uygulandı.');
