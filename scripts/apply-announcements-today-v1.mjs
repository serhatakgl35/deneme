import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
function read(rel){ return fs.readFileSync(path.join(root, rel), 'utf8'); }
function write(rel, content){ fs.writeFileSync(path.join(root, rel), content); }
function copy(from, to){
  const src = path.join(root, from); const dest = path.join(root, to);
  if(!fs.existsSync(src)) throw new Error(`Eksik dosya: ${from}`);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}
function replaceOnce(source, label, from, to){
  if(!source.includes(from)) throw new Error(`Duyuru/faaliyet v1 yaması uygulanamadı: ${label}`);
  return source.replace(from, to);
}

copy('patches/announcements-today-v1/AnnouncementPopup.tsx', 'src/components/AnnouncementPopup.tsx');
copy('patches/announcements-today-v1/AnnouncementPopup.module.css', 'src/components/AnnouncementPopup.module.css');
copy('patches/announcements-today-v1/TodayActivitiesPage.tsx', 'src/pages/TodayActivitiesPage.tsx');
copy('patches/announcements-today-v1/TodayActivitiesPage.module.css', 'src/pages/TodayActivitiesPage.module.css');

let layout = read('src/components/Layout.tsx');
layout = replaceOnce(
  layout,
  'popup import',
  `import previewStyles from './RolePreview.module.css';`,
  `import previewStyles from './RolePreview.module.css';\nimport { AnnouncementPopup } from './AnnouncementPopup';`
);
layout = replaceOnce(
  layout,
  'popup render',
  `    </main>\n  </div>;`,
  `    </main>\n    <AnnouncementPopup/>\n  </div>;`
);
write('src/components/Layout.tsx', layout);

let app = read('src/app/App.tsx');
app = replaceOnce(
  app,
  'today activities import',
  `import { MyTeamTodayPage } from '../pages/MyTeamTodayPage';`,
  `import { MyTeamTodayPage } from '../pages/MyTeamTodayPage';\nimport { TodayActivitiesPage } from '../pages/TodayActivitiesPage';`
);
app = replaceOnce(
  app,
  'today activities route',
  `        <Route path="/timim-bugun" element={<MyTeamTodayPage/>}/>` ,
  `        <Route path="/timim-bugun" element={<MyTeamTodayPage/>}/>\n        <Route path="/bugunun-faaliyetleri" element={<TodayActivitiesPage/>}/>`
);
write('src/app/App.tsx', app);

let dashboard = read('src/pages/DashboardPage.tsx');
let dashboardCss = read('src/pages/DashboardPage.module.css');

dashboard = replaceOnce(
  dashboard,
  'today activity type',
  `type MealSelection = { meal:'breakfast'|'dinner'; selection:'yes'|'no'|'reserve' };`,
  `type MealSelection = { meal:'breakfast'|'dinner'; selection:'yes'|'no'|'reserve' };\ntype TodayActivity = { id:string; start_time:string|null; title:string; location:string|null };`
);

dashboard = replaceOnce(
  dashboard,
  'today activity state',
  `  const [mealSelections,setMealSelections]=useState<MealSelection[]>([]);`,
  `  const [mealSelections,setMealSelections]=useState<MealSelection[]>([]);\n  const [todayActivities,setTodayActivities]=useState<TodayActivity[]>([]);`
);

const mealPromiseLine = `      const mealPromise=account.personnelId?supabase.from('meal_selections').select('meal,selection').eq('personnel_id',account.personnelId).eq('meal_date',date):Promise.resolve({data:[],error:null});`;
dashboard = replaceOnce(
  dashboard,
  'today activity promise',
  mealPromiseLine,
  `${mealPromiseLine}\n      const activityPromise=supabase.from('weekly_activities').select('id,start_time,title,location').eq('activity_date',todayIso()).order('start_time',{ascending:true,nullsFirst:false});`
);

dashboard = replaceOnce(
  dashboard,
  'today activity promise result',
  `      const[nextSnapshot,pendingResult,ownResult,balanceResult,debtResult,menuResult,mealResult]=await Promise.all([statusPromise,pendingPromise,ownPromise,balancePromise,debtPromise,menuPromise,mealPromise]);`,
  `      const[nextSnapshot,pendingResult,ownResult,balanceResult,debtResult,menuResult,mealResult,activityResult]=await Promise.all([statusPromise,pendingPromise,ownPromise,balancePromise,debtPromise,menuPromise,mealPromise,activityPromise]);`
);

dashboard = replaceOnce(
  dashboard,
  'today activity error',
  `      if(mealResult.error)throw mealResult.error;`,
  `      if(mealResult.error)throw mealResult.error;\n      if(activityResult.error)throw activityResult.error;`
);

dashboard = replaceOnce(
  dashboard,
  'today activity state set',
  `      setMealSelections((mealResult.data??[]) as MealSelection[]);`,
  `      setMealSelections((mealResult.data??[]) as MealSelection[]);\n      setTodayActivities((activityResult.data??[]) as TodayActivity[]);`
);

const activityCard = `\n        <Link to="/bugunun-faaliyetleri" className={\`${'${styles.summaryCard}'} ${'${styles.summaryLink}'} ${'${styles.activitySummaryCard}'}\`}>\n          <span>Bugünün Faaliyetleri</span>\n          <strong>{todayActivities.length?\`${'${todayActivities.length}'} faaliyet\`:'Faaliyet yok'}</strong>\n          {todayActivities.length?<div className={styles.todayActivityList}>{todayActivities.slice(0,2).map(row=><span key={row.id}><b>{row.start_time?row.start_time.slice(0,5):'—'}</b><em>{row.title}</em></span>)}</div>:null}\n          <small>{todayActivities.length?'Bugünkü faaliyetleri görüntüle →':'Faaliyet takvimini aç →'}</small>\n        </Link>`;

const mealMarker = `<Link to="/yemek" className={\`${'${styles.summaryCard}'} ${'${styles.summaryLink}'} ${'${styles.mealSummaryCard}'}\`}>`;
const positions = [];
let searchFrom = 0;
while(true){
  const index = dashboard.indexOf(mealMarker, searchFrom);
  if(index < 0) break;
  positions.push(index);
  searchFrom = index + mealMarker.length;
}
if(positions.length < 2) throw new Error(`Duyuru/faaliyet v1 yaması uygulanamadı: özet yemek kartları (${positions.length})`);
for(let i = positions.length - 1; i >= 0; i--){
  const start = positions[i];
  const end = dashboard.indexOf(`        </Link>`, start);
  if(end < 0) throw new Error('Duyuru/faaliyet v1 yaması uygulanamadı: yemek kartı kapanışı');
  const insertAt = end + `        </Link>`.length;
  dashboard = dashboard.slice(0, insertAt) + activityCard + dashboard.slice(insertAt);
}

const cssPatch = `\n/* announcement + today activity dashboard v1 */\n.activitySummaryCard{min-height:150px}.todayActivityList{display:grid;gap:5px;margin-top:10px}.todayActivityList>span{display:grid!important;grid-template-columns:42px minmax(0,1fr);align-items:center;gap:7px;padding:6px 7px;border:1px solid #e3eae8;background:#fbfdfc;border-radius:10px;text-transform:none!important;letter-spacing:0!important}.todayActivityList b{font-size:8px;color:#168c7d}.todayActivityList em{min-width:0;font-size:8.5px;font-style:normal;font-weight:800;color:#385057;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.managerSummaryGrid{grid-template-columns:1.18fr .68fr 1.12fr .92fr}.summaryGrid:not(.managerSummaryGrid){grid-template-columns:repeat(5,minmax(0,1fr))}\n@media(max-width:1120px){.managerSummaryGrid,.summaryGrid:not(.managerSummaryGrid){grid-template-columns:1fr 1fr}.managerSummaryGrid .mealSummaryCard{grid-column:auto}.activitySummaryCard{min-height:0}}\n@media(max-width:720px){.managerSummaryGrid,.summaryGrid:not(.managerSummaryGrid){grid-template-columns:1fr}.todayActivityList>span{grid-template-columns:38px minmax(0,1fr)}}\n`;
if(!dashboardCss.includes('/* announcement + today activity dashboard v1 */')) dashboardCss += cssPatch;

write('src/pages/DashboardPage.tsx', dashboard);
write('src/pages/DashboardPage.module.css', dashboardCss);
console.log('Yeni duyuru popup ve bugünün faaliyetleri özeti uygulandı.');
